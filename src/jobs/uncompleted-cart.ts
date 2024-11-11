import {
	Logger,
	type CartService,
	type ScheduledJobArgs,
	type ScheduledJobConfig,
} from '@medusajs/medusa';

const AFTER_DAYS = 3;

export default async function handler({
	container,
	data,
	pluginOptions,
}: ScheduledJobArgs) {
	const logger = container.resolve<Logger>('logger');

	logger.info('Running uncompleted cart delete job');

	const cartService: CartService = container.resolve('cartService');

	// Find all uncompleted carts older than 3 days
	const weeklyCarts = await cartService.list({
		created_at: {
			lte: new Date(Date.now() - AFTER_DAYS * 24 * 60 * 60 * 1000),
		},
	});

	// Filter out all carts that are completed or payment authorized
	const uncompletedCarts = weeklyCarts.filter((cart) => {
		return cart.completed_at === null && cart.payment_authorized_at === null;
	});

	for (const cart of uncompletedCarts) {
		await cartService.delete(cart.id);
	}

	logger.info(`Deleted ${uncompletedCarts.length} uncompleted carts`);
	logger.info('Uncompleted cart delete job completed');
}

export const config: ScheduledJobConfig = {
	name: 'uncompleted-cart-delete-once-a-day',
	schedule: '0 17 * * *', // Run daily at 00:00 AM GMT+7
	data: {},
};
