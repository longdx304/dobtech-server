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

	console.log('Running test');
	logger.info('test job');

}

export const config: ScheduledJobConfig = {
	name: 'test',
	schedule: '35 * * * *',
	data: {},
};
