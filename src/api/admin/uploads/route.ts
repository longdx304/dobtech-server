import { promiseAll } from '@medusajs/utils';
import { IFileService, MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import fs from 'fs';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const fileService: IFileService = req.scope.resolve('fileService');

	const body = req.body as any;

	const files = (req?.files as Express.Multer.File[]) ?? [];
	const prefix = body?.prefix || '';

	try {
		const result = await promiseAll(
			files?.map(async (f) => {
				return fileService
					.upload({ ...f, destination: prefix })
					.then((result) => {
						fs.unlinkSync(f.path);
						return result;
					});
			})
		);
		res.status(200).json({ uploads: result });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
}
