import {
	AbstractPaymentProcessor,
	AbstractPaymentService,
	isPaymentProcessorError,
	Logger,
	PaymentProviderService as MedusaPaymentProviderService,
	Payment,
	PaymentProcessorError,
	Refund,
} from '@medusajs/medusa';
import PaymentRepository from '@medusajs/medusa/dist/repositories/payment';
import PaymentProviderRepository from '@medusajs/medusa/dist/repositories/payment-provider';
import PaymentSessionRepository from '@medusajs/medusa/dist/repositories/payment-session';
import RefundRepository from '@medusajs/medusa/dist/repositories/refund';
import {
	CustomerService,
	PaymentService,
} from '@medusajs/medusa/dist/services';
import { FlagRouter, MedusaError } from '@medusajs/utils';
import { BasePaymentService } from 'medusa-interfaces';
import { EntityManager } from 'typeorm';
import MyPaymentService from './my-payment';
import { EOL } from 'os';

type PaymentProviderKey = `pp_${string}` | 'systemPaymentProviderService';

type InjectedDependencies = {
	manager: EntityManager;
	paymentSessionRepository: typeof PaymentSessionRepository;
	paymentProviderRepository: typeof PaymentProviderRepository;
	paymentRepository: typeof PaymentRepository;
	refundRepository: typeof RefundRepository;
	paymentService: PaymentService;
	customerService: CustomerService;
	featureFlagRouter: FlagRouter;
	logger: Logger;
	myPaymentService: MyPaymentService;
} & {
	[key in `${PaymentProviderKey}`]:
		| AbstractPaymentService
		| typeof BasePaymentService;
};
export default class MyPaymentProviderService extends MedusaPaymentProviderService {
	protected readonly myPaymentService_: MyPaymentService;

	constructor(container: InjectedDependencies) {
		super(container);
		this.myPaymentService_ = container.myPaymentService;
	}

	async updateNewPayment(
		paymentId: string,
		data: { supplier_order_id?: string }
	): Promise<Payment> {
		return await this.atomicPhase_(async (transactionManager) => {
			return await this.myPaymentService_
				.withTransaction(transactionManager)
				.updateNewPayment(paymentId, data);
		});
	}

	async refundSupplierPayment(
		payObjs: Payment[],
		amount: number,
		reason: string,
		note?: string
	): Promise<Refund> {
		return await this.atomicPhase_(async (transactionManager) => {
			const payments = await this.listPayments({
				id: payObjs.map((p) => p.id),
			});

			let supplier_order_id!: string;
			const refundable = payments.reduce((acc, next) => {
				supplier_order_id = next.supplier_order_id;
				if (next.captured_at) {
					return (acc += next.amount - next.amount_refunded);
				}

				return acc;
			}, 0);

			if (refundable < amount) {
				throw new MedusaError(
					MedusaError.Types.NOT_ALLOWED,
					'Refund amount is greater that the refundable amount'
				);
			}

			let balance = amount;

			const used: string[] = [];

			const paymentRepo = transactionManager.withRepository(
				this.paymentRepository_
			);

			let paymentToRefund = payments.find(
				(payment) => payment.amount - payment.amount_refunded > 0
			);

			while (paymentToRefund) {
				const currentRefundable =
					paymentToRefund.amount - paymentToRefund.amount_refunded;

				const refundAmount = Math.min(currentRefundable, balance);

				const provider = this.retrieveProvider(paymentToRefund.provider_id);

				if (provider instanceof AbstractPaymentProcessor) {
					const res = await provider.refundPayment(
						paymentToRefund.data,
						refundAmount
					);
					if (isPaymentProcessorError(res)) {
						this.throwFromSupplierPaymentProcessorError(
							res as PaymentProcessorError
						);
					} else {
						// Use else to avoid casting the object and infer the type instead
						paymentToRefund.data = res;
					}
				} else {
					paymentToRefund.data = await provider
						.withTransaction(transactionManager)
						.refundPayment(paymentToRefund, refundAmount);
				}

				paymentToRefund.amount_refunded += refundAmount;
				await paymentRepo.save(paymentToRefund);

				balance -= refundAmount;

				used.push(paymentToRefund.id);

				if (balance > 0) {
					paymentToRefund = payments.find(
						(payment) =>
							payment.amount - payment.amount_refunded > 0 &&
							!used.includes(payment.id)
					);
				} else {
					paymentToRefund = undefined;
				}
			}

			const refundRepo = transactionManager.withRepository(
				this.refundRepository_
			);

			const toCreate = {
				supplier_order_id,
				amount,
				reason,
				note,
			};

			const created = refundRepo.create(toCreate);
			return await refundRepo.save(created);
		});
	}
	private throwFromSupplierPaymentProcessorError(
		errObj: PaymentProcessorError
	) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`${errObj.error}${errObj.detail ? `:${EOL}${errObj.detail}` : ''}`,
			errObj.code
		);
	}
}
