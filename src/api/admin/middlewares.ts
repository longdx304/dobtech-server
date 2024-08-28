// src/api/middlewares.ts
import { parseCorsOrigins } from 'medusa-core-utils';
import * as cors from 'cors';
import { MiddlewaresConfig } from '@medusajs/medusa';

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
