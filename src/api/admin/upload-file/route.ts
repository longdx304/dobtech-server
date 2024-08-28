import type { MedusaRequest, MedusaResponse } from "@medusajs/medusa";
import UploadFileService from "src/services/uploadFile";
import { TDeleteFile } from "src/types/uploads";

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
	const uploadFileService: UploadFileService =
		req.scope.resolve("uploadFileService");

	try {
		await uploadFileService.deleteFile(req.body as TDeleteFile);
		res.status(200).json({ message: "Delete file successfully" });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
}
