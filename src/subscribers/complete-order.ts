import { OrderService, PaymentStatus } from "@medusajs/medusa";

class CompleteOrderSubscriber {

  orderService: OrderService;

  constructor({ eventBusService, orderService }) {
    this.orderService = orderService;
    eventBusService.subscribe(
      OrderService.Events.SHIPMENT_CREATED,
      this.onShipmentCreated
    );
    // Added payment_captured event, as shipment can happen before payment by default
    eventBusService.subscribe(
      OrderService.Events.PAYMENT_CAPTURED,
      this.onShipmentCreated
    );
  }

  onShipmentCreated = async ({ id }) => {
    const order = await this.orderService.retrieve(id, {
      relations: ["items"],
    });

    const isPaymentCaptured = order.payment_status === PaymentStatus.CAPTURED;

    const areAllItemsShipped = order.items.every(
      (i) => i.shipped_quantity === i.quantity
    );

    if (isPaymentCaptured && areAllItemsShipped) {
      this.orderService.completeOrder(id);
    }
  };
}

export default CompleteOrderSubscriber;