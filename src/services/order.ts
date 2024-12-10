import { OrderService as MedusaOrderService } from '@medusajs/medusa';
import { EntityManager } from 'typeorm';

type InjectedDependencies = {
	manager: EntityManager;
};

class OrderService extends MedusaOrderService {
	protected manager_: EntityManager;

	constructor({}: InjectedDependencies) {
		super(arguments[0]);
	}

	async asignOrderToHandler(orderId: string, handlerId: string) {
		return this.atomicPhase_(async (transactionManager: EntityManager) => {
			const orderRepository = transactionManager.withRepository(
				this.orderRepository_
			);
			const order = await orderRepository.findOne({ where: { id: orderId } });
			order.handler_id = handlerId;
			return await orderRepository.save(order);
		});
	}
}

export default OrderService;
