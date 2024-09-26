import axios from 'axios';
import EmailTemplates from 'email-templates';
import { Logger, NotificationService, OrderService } from 'medusa-interfaces';
import SupplierOrderService from './supplier-order';
import nodemailer from 'nodemailer';
import path from 'path';

interface EmailConfig {
	templateDir: string;
	fromAddress: string;
	smtpHost: string;
	smtpPort: number;
	smtpUser: string;
	smtpPassword: string;
}

class EmailsService extends NotificationService {
	static identifier = 'emails';
	static is_installed = true;

	protected orderService: OrderService;
	protected cartService: any;
	protected lineItemService: any;
	protected logger: Logger;
	protected emailConfig: EmailConfig;
	protected supplierOrderService :SupplierOrderService;

	constructor(container: any, _options: EmailConfig) {
		super(container);

		this.logger = container.logger;
		this.logger.info('✔ Email service initialized');

		this.orderService = container.orderService;
		this.cartService = container.cartService;
		this.lineItemService = container.lineItemService;
		// Set default options and override with provided options
		this.emailConfig = {
			fromAddress: `"DOB CHAMDEP" <${process.env.EMAIL_FROM_ADDRESS}>`,
			templateDir: path.resolve(process.cwd(), 'data/emails'),
			smtpHost: process.env.EMAIL_SMTP_HOST,
			smtpPort: process.env.EMAIL_SMTP_PORT,
			smtpUser: process.env.EMAIL_SMTP_USER,
			smtpPassword: process.env.EMAIL_SMTP_PASSWORD,
			..._options,
		};
		if (!this.emailConfig.templateDir) {
			this.emailConfig.templateDir = path.resolve(process.cwd(), 'data/emails');
		}
		this.logger.info(
			`Email templates loaded from ${this.emailConfig.templateDir}`
		);
	}

	async sendNotification(
		event: string,
		data: any,
		attachmentGenerator?: unknown
	): Promise<{
		to: string;
		status: string;
		data: Record<string, any>;
	}> {
		this.logger.info(`Sending notification '${event}' via email service`);
		if (event.includes('order.')) {
			// retrieve order
			// @ts-ignore
			const order = await this.orderService.retrieve(data.id || '', {
				relations: [
					'refunds',
					'items',
					'customer',
					'billing_address',
					'shipping_address',
					'discounts',
					'discounts.rule',
					'shipping_methods',
					'shipping_methods.shipping_option',
					'payments',
					'fulfillments',
					'fulfillments.tracking_links',
					'returns',
					'gift_cards',
					'gift_card_transactions',
				],
			});
			this.logger.info(`Order: ${JSON.stringify(order)}`);

			let totalValue = order.items.reduce((value, item) => {
				return value + item.unit_price * item.quantity;
			}, 0);

			let isDiscount = totalValue > order.payments[0].amount;

			for (const option of order.shipping_methods) {
				totalValue += option.shipping_option.amount;
			}
			await this.sendEmail(order.email, event, {
				event,
				order,
				cart: await this.cartService.retrieve(order.cart_id || ''),
				id: data.id,
				items: order.items,
				isDiscount,
				payments: order.payments,
				total_value: totalValue,
				trackingUrl: `${process.env.NEXT_PUBLIC_STOREFRONT_URL}/order/confirmed/${data.id}`,
			});

			return {
				to: order.email,
				data: data,
				status: 'sent',
			};
		}

		return {
			to: null,
			data: {},
			status: 'sent',
		};
	}

	async resendNotification(
		notification: unknown,
		config: unknown,
		attachmentGenerator: unknown
	): Promise<{
		to: string;
		status: string;
		data: Record<string, unknown>;
	}> {
		await this.sendEmail('customer@test.com', 'sample', {
			event: notification,
		});

		return {
			to: 'customer@test.com',
			data: {},
			status: 'sent',
		};
	}

	/**
	 * Sends an email using the configured SMTP server and template engine.
	 * The function will log information about the email being sent and any errors that occur.
	 * If the email is sent successfully, it will return the result of the send operation.
	 * If an error occurs, it will throw an error.
	 * @param toAddress - The email address to send the email to
	 * @param templateName - The name of the template to use for the email
	 * @param data - The data to pass to the template engine
	 * @param options - An object with options for the email. Currently only supports a single option: `attachments`.
	 * @returns The result of the send operation
	 */
	async sendEmail(
		toAddress: string,
		templateName: string,
		data: any,
		options?: any
	) {
		this.logger.info(`Sending notification '${templateName}' via email service`);
		this.logger.info(JSON.stringify(data));

		try {
			const transport = nodemailer.createTransport({
				host: this.emailConfig.smtpHost,
				port: this.emailConfig.smtpPort,
				auth: {
					user: this.emailConfig.smtpUser,
					pass: this.emailConfig.smtpPassword,
				},
				secure: true,
			});

			// Verify SMTP connection configuration
			await transport.verify();
			this.logger.info('SMTP connection verified successfully');

			// Use a stream instead of a file path
			// create a readable stream from the URL and use that as the attachment.
			// This avoids having to save the file locally
			let attachments = [];
			if (options?.attachments && options?.attachments?.length) {
				attachments = await Promise.all(
					options.attachments.map(async (attachment) => {
						if (attachment.path.startsWith('http')) {
							const response = await axios.get(attachment.path, {
								responseType: 'stream',
							});
							return {
								filename: attachment.filename,
								content: response.data,
							};
						}
						return attachment;
					})
				);
			}

			const email = new EmailTemplates({
				message: {
					from: this.emailConfig.fromAddress,
					attachments,
					cc: options?.cc ?? '',
				},
				transport: transport,
				views: {
					root: this.emailConfig.templateDir,
					options: {
						extension: 'pug',
					},
				},
				send: true,
				preview: false,
			});

			const result = await email.send({
				template: templateName,
				message: {
					to: toAddress,
				},
				locals: {
					...data,
				},
			});

			this.logger.info(`Email sent successfully to ${toAddress}`);
			return result;
		} catch (error) {
			this.logger.error(
				`Failed to send email to ${toAddress}: ${error.message}`
			);
			throw error;
		}
	}
}

export default EmailsService;
