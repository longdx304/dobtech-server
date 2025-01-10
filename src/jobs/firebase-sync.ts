import {
	ProductVariant,
	type Logger,
	type ProductVariantService,
	type ScheduledJobArgs,
	type ScheduledJobConfig,
} from '@medusajs/medusa';
import { UpdateProductVariantInput } from '@medusajs/medusa/dist/types/product-variant';
import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import nodemailer, { TransportOptions } from 'nodemailer';

// Firebase configuration
const firebaseConfig = {
	apiKey: process.env.FB_API_KEY,
	authDomain: process.env.FB_AUTH_DOMAIN,
	projectId: process.env.FB_PROJECT_ID,
	storageBucket: process.env.FB_STORAGE_BUCKET,
	messagingSenderId: process.env.FB_MESSAGING_SENDER_ID,
	appId: process.env.FB_APP_ID,
	measurementId: process.env.FB_MEASUREMENT_ID,
};

// Email configuration
const emailConfig = {
	host: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
	port: Number(process.env.EMAIL_SMTP_PORT) || 465,
	secure: true, // true for 465, false for other ports
	auth: {
		user: process.env.EMAIL_SMTP_USER,
		pass: process.env.EMAIL_SMTP_PASSWORD,
	},
} as TransportOptions;

const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM_ADDRESS;
const fromEmail = process.env.EMAIL_FROM_ADDRESS;

// Sends an error email to the administrator whenever an error occurs while syncing inventory.
async function sendErrorEmail(error: Error, details: any) {
	try {
		const transporter = nodemailer.createTransport(emailConfig);

		const errorDate = new Date().toLocaleString();
		const errorMessage = `
      <h2>Inventory Sync Error</h2>
      <p><strong>Time:</strong> ${errorDate}</p>
      <p><strong>Error Message:</strong> ${error.message}</p>
      <p><strong>Error Stack:</strong></p>
      <pre>${error.stack}</pre>

      <h3>Additional Details:</h3>
      <pre>${JSON.stringify(details, null, 2)}</pre>
    `;

		await transporter.sendMail({
			from: fromEmail,
			to: adminEmail,
			subject: `[URGENT] Inventory Sync Error - ${errorDate}`,
			html: errorMessage,
		});

		console.log('Error notification email sent successfully');
	} catch (emailError) {
		console.error('Failed to send error notification email:', emailError);
	}
}

// Gets inventory from Firebase
async function getFirebaseInventory(db) {
	const stock = {};
	const colRef = collection(db, 'products');
	const snapshot = await getDocs(colRef);

	snapshot.forEach((doc) => {
		const id = doc.id;
		let quantity = 0;
		doc.data().inventory.forEach((count) => {
			switch (count.unit) {
				case 'đôi':
					quantity += 1 * count.quantity;
					break;
				case 'bao 240':
					quantity += 240 * count.quantity;
					break;
				case 'bao 120':
					quantity += 120 * count.quantity;
					break;
				case 'bao 60':
					quantity += 60 * count.quantity;
					break;
				case 'bịch 6':
					quantity += 6 * count.quantity;
					break;
				case 'thùng':
					quantity += (id.slice(0, 3) === 'aer' ? 12 : 6) * count.quantity;
					break;
				case 'bịch 12':
					quantity += 12 * count.quantity;
					break;
				case 'giỏ 24':
					quantity += 24 * count.quantity;
					break;
			}
		});
		stock[id] = quantity;
	});

	return stock;
}

type UpdateData = {
	variant: ProductVariant;
	updateData: UpdateProductVariantInput;
};

export default async function handler({
	container,
	data,
	pluginOptions,
}: ScheduledJobArgs) {
	const logger: Logger = container.resolve('logger');

	if (!firebaseConfig.apiKey) {
		logger.error('Firebase configuration missing');
		throw new Error('Firebase configuration missing');
	}

	logger.info('Starting inventory sync job');
	try {
		// Initialize Firebase
		const app = initializeApp(firebaseConfig);
		const db = getFirestore(app);
		logger.info('Firebase initialized');

		// Get product variant service
		const productVariantService: ProductVariantService = container.resolve(
			'productVariantService'
		);
		logger.info('Product variant service resolved');

		// Get inventory data from Firebase
		const firebaseInventory = await getFirebaseInventory(db);
		logger.info(
			`Inventory data fetched from Firebase: ${
				Object.keys(firebaseInventory).length
			}`
		);

		// Get all variants from Medusa
		const variants = await productVariantService.list(
			{},
			{ select: ['id', 'sku', 'inventory_quantity'] }
		);
		logger.info(`Variants fetched from Database: ${variants.length}`);

		// Prepare batch update data
		const updateData: UpdateData[] = [];

		for (const variant of variants) {
			const sku = variant.sku;
			if (
				sku &&
				firebaseInventory[sku] !== undefined &&
				variant.inventory_quantity !== firebaseInventory[sku]
			) {
				updateData.push({
					variant: variant,
					updateData: {
						inventory_quantity: firebaseInventory[sku],
					},
				});
			}
		}

		logger.info(`Inventory update data prepared: ${updateData.length}`);

		// Perform batch update if there are changes
		if (updateData.length > 0) {
			logger.info(`Updating inventory for ${updateData.length} variants`);
			await productVariantService.update(updateData);
			logger.info('Inventory update completed successfully');
		} else {
			// No updates required
			logger.info('No inventory updates required');
		}
	} catch (error) {
		logger.error('Error updating inventory:', error);
		// Send detailed error notification
		await sendErrorEmail(error, {
			type: 'SYNC_ERROR',
			timestamp: new Date().toISOString(),
			message: 'Failed to sync inventory',
		});

		throw error;
	}
}

export const config: ScheduledJobConfig = {
	name: 'sync-firebase-inventory',
	schedule: '0 5 * * *',
	data: {},
};
