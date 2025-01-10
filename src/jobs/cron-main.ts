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

	logger.info(`------------Cron Job------------, ${new Date().toISOString()}`);
	logger.info('------------Hourly------------');
	logger.info('------------Test------------');


}

export const config: ScheduledJobConfig = {
	name: 'cron-main-check',
	schedule: '*/10 * * * *',
	data: {},
};
