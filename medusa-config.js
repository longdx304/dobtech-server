const dotenv = require('dotenv');

let ENV_FILE_NAME = '';
switch (process.env.NODE_ENV) {
	case 'production':
		ENV_FILE_NAME = '.env.production';
		break;
	case 'staging':
		ENV_FILE_NAME = '.env.staging';
		break;
	case 'test':
		ENV_FILE_NAME = '.env.test';
		break;
	case 'development':
	default:
		ENV_FILE_NAME = '.env';
		break;
}

try {
	dotenv.config({ path: process.cwd() + '/' + ENV_FILE_NAME });
} catch (e) {}

// CORS when consuming Medusa from admin
const ADMIN_CORS = process.env.ADMIN_CORS || '/.+/';

// CORS to avoid issues when consuming Medusa from a client
const STORE_CORS = process.env.STORE_CORS || 'http://localhost:8000';

const DATABASE_URL =
	process.env.DATABASE_URL || 'postgres://localhost/medusa-starter-default';

const TEST_DATABASE_URL =
	process.env.TEST_DATABASE_URL || 'postgres://localhost/medusa-test';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const plugins = [
	`medusa-fulfillment-manual`,
	`medusa-payment-manual`,
	{
		resolve: `medusa-file-s3`,
		options: {
			s3_url: process.env.S3_URL,
			bucket: process.env.S3_BUCKET,
			region: process.env.S3_REGION,
			access_key_id: process.env.S3_ACCESS_KEY_ID,
			secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
			cache_control: process.env.S3_CACHE_CONTROL,
			// optional
			download_file_duration: process.env.S3_DOWNLOAD_FILE_DURATION,
		},
	},
	{
		resolve: `medusa-plugin-categories`,
	},
];

const modules = {
	eventBus: {
		resolve: '@medusajs/event-bus-redis',
		options: {
			redisUrl: REDIS_URL,
		},
	},
	cacheService: {
		resolve: '@medusajs/cache-redis',
		options: {
			redisUrl: REDIS_URL,
			ttl: 0,
		},
	},
};

/** @type {import('@medusajs/medusa').ConfigModule["projectConfig"]} */
const projectConfig = {
	jwtSecret: process.env.JWT_SECRET,
	cookieSecret: process.env.COOKIE_SECRET,
	store_cors: STORE_CORS,
	database_url: DATABASE_URL,
	// database_url: TEST_DATABASE_URL,
	admin_cors: ADMIN_CORS,
	redis_url: REDIS_URL,
};

const featureFlags = {
	product_categories: true,
	order_editing: true,
	sales_channels: true,
	publishable_api_keys: true,
};

/** @type {import('@medusajs/medusa').ConfigModule} */
module.exports = {
	projectConfig,
	plugins,
	modules,
	featureFlags,
};
