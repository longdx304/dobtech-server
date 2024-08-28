import { MedusaRequest, MedusaResponse } from "@medusajs/medusa";
import MyPaymentService from "src/services/my-payment";
import { EntityManager } from "typeorm";

export async function POST(
	req: MedusaRequest,
	res: MedusaResponse
): Promise<void> {
	try {
		const myPaymentService: MyPaymentService =
			req.scope.resolve("myPaymentService");
		const { id } = req.params;

		const manager: EntityManager = req.scope.resolve("manager");

		// Capture payment
		const data = await manager.transaction(async (transactionManager) => {
			return await myPaymentService
				.withTransaction(transactionManager)
				.capturePayment(id, req.body);
		});

		res.json({
			message: "Capture payment successfully",
			data,
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: error.message });
	}
}
