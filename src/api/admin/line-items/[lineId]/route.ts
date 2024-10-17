import {
	LineItem,
	LineItemService,
	MedusaRequest,
	MedusaResponse,
	OrderService,
} from '@medusajs/medusa';
import MyPaymentService from 'src/services/my-payment';

export async function POST(
	req: MedusaRequest,
	res: MedusaResponse
): Promise<void> {
	const lineItemService = req.scope.resolve<LineItemService>('lineItemService');
	const orderService = req.scope.resolve<OrderService>('orderService');

	const myPaymentService: MyPaymentService =
		req.scope.resolve('myPaymentService');
	const { lineId } = req.params;

	try {
		const lineItem: LineItem = await lineItemService.retrieve(lineId, {
			relations: ['tax_lines'],
		});

		// Update the line item
		const lineItemUpdate = await lineItemService.update(
			lineId,
			req.body as Partial<LineItem>
		);

		const updateTimelineMetadata = {
			type: 'line_item_updated',
			line_item_id: lineItem.id,
			title: lineItem.title,
			thumbnail: lineItem.thumbnail,
			quantity: lineItem.quantity,
			old_price: lineItem.unit_price,
			rate: lineItem?.tax_lines[0]?.rate ?? 0,
			created_at: new Date().toISOString(),
			...(req.body as object),
		};
		if (lineItem.order_id) {
			// If the line item belongs to an order, update the order
			const order = await orderService.retrieveWithTotals(lineItem.order_id);

			// Update the payment amount
			if (order.payments && order.payments.length > 0) {
				await myPaymentService.updateAmountPayment(
					order.payments[0].id,
					order.total
				);
			}

			// Change the line item's metadata to include the updated line item
			const changedLineItem: any[] = order?.metadata?.timeline
				? [...(order?.metadata?.timeline as any[]), updateTimelineMetadata]
				: [updateTimelineMetadata];

			// Update the order's metadata to include the updated line item
			await orderService.update(order.id, {
				metadata: {
					...order.metadata,
					timeline: changedLineItem,
				},
			});
		}

		res.json({
			message: 'Update line item successfully',
			lineItem: lineItemUpdate,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
}
