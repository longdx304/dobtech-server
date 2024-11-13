// src/api/middlewares.ts
import { MiddlewaresConfig } from '@medusajs/medusa';
import * as cors from 'cors';
import { parseCorsOrigins } from 'medusa-core-utils';

export const config: MiddlewaresConfig = {
	routes: [
		{
			matcher: /^\/store(\/.*)?$/,
			middlewares: [
				cors.default({
					credentials: true,
					origin: parseCorsOrigins(process.env.STORE_CORS ?? ''),
				}),
			],
		},
	],
};
