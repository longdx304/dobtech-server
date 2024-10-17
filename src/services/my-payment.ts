import {
	OrderService,
	Payment,
	TransactionBaseService,
} from '@medusajs/medusa';
import PaymentRepository from '@medusajs/medusa/dist/repositories/payment';
import { EventBusService } from '@medusajs/medusa/dist/services';
import { EntityManager } from 'typeorm';

type InjectedDependencies = {
	manager: EntityManager;
	paymentRepository: typeof PaymentRepository;
	orderService: OrderService;
};

type UpdatePaymentInput = {
	[key: string]: any;
};

class MyPaymentService extends TransactionBaseService {
	protected readonly eventBusService_: EventBusService;
	protected paymentRepository_: typeof PaymentRepository;
	private orderService: OrderService;

	constructor(container: InjectedDependencies) {
		super(container);

		this.paymentRepository_ = container.paymentRepository;
		this.orderService = container.orderService;
	}

	/**
	 * Updates a payment in order to link it to an order or a swap.
	 * @param paymentId - the id of the payment
	 * @param data - order_id or swap_id to link the payment
	 * @return the payment updated.
	 */
	async updateNewPayment(
		paymentId: string,
		data: { supplier_order_id?: string }
	): Promise<Payment> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				const paymentRepository = transactionManager.withRepository(
					this.paymentRepository_
				);

				const payment = await this.retrieve(paymentId);

				if (data?.supplier_order_id) {
					payment.supplier_order_id = data.supplier_order_id;
				}

				const updatedPayment = await paymentRepository.save(payment);

				return updatedPayment;
			}
		);
	}

	// Retrieve a payment by id
	async retrieve(id: string): Promise<Payment | undefined> {
		const paymentRepo = this.activeManager_.withRepository(
			this.paymentRepository_
		);

		const payment = await paymentRepo.findOne({
			where: { id },
		});

		return payment;
	}

	async capturePayment(id: string, data: UpdatePaymentInput): Promise<Payment> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				const paymentRepository = transactionManager.withRepository(
					this.paymentRepository_
				);

				let payment = await this.retrieve(id);

				// Calculate the new paid_total
				const paid_total =
					(payment?.data?.paid_total ?? 0) + (data?.paid_total ?? 0);

				// Get the paid array from the payment data
				const paid: any[] = (payment.data?.paid as any[]) ?? [];
				paid.push({
					amount: data?.paid_total ?? 0,
					created_at: new Date(),
				});
				// If the paid_total is equal to the payment amount, capture the payment
				if (paid_total === payment.amount) {
					if (payment.order_id) {
						const order = await this.orderService.capturePayment(
							payment.order_id
						);
						payment = order.payments.find((p) => p.id === id);
					}
				}
				// Update the payment with the new paid_total
				const updatePayment = {
					...payment,
					data: {
						...payment.data,
						paid_total,
						paid,
					},
				};
				return await paymentRepository.save(updatePayment);
			}
		);
	}

	async updateAmountPayment(id: string, amount: number): Promise<Payment> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				const paymentRepository = transactionManager.withRepository(
					this.paymentRepository_
				);
				return await paymentRepository.save({
					id,
					amount,
				});
			}
		);
	}
}

export default MyPaymentService;
