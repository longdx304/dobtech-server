import { PaymentStatus } from '@medusajs/medusa';
import SupplierOrderService from '../services/supplier-order';

class CompleteSupplierOrderSubscriber {
	supplierOrderService: SupplierOrderService;

	constructor({ eventBusService, supplierOrderService }) {
		this.supplierOrderService = supplierOrderService;

		// Added payment_captured event, as shipment can happen before payment by default
		eventBusService.subscribe(
			SupplierOrderService.Events.PAYMENT_CAPTURED,
			this.onCompleteSupplierOrder
		);
	}

	onCompleteSupplierOrder = async ({ id }) => {
		const supplierOrder = await this.supplierOrderService.retrieve(id, {
			relations: ['items'],
		});

		const isPaymentCaptured =
			supplierOrder.payment_status === PaymentStatus.CAPTURED;

		if (isPaymentCaptured) {
			this.supplierOrderService.completeSupplierOrder(id);
		}
	};
}

export default CompleteSupplierOrderSubscriber;
