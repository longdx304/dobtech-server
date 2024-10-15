import {
	AbstractPaymentService,
	Logger,
	PaymentProviderService as MedusaPaymentProviderService,
	Payment,
} from '@medusajs/medusa';
import PaymentRepository from '@medusajs/medusa/dist/repositories/payment';
import PaymentProviderRepository from '@medusajs/medusa/dist/repositories/payment-provider';
import PaymentSessionRepository from '@medusajs/medusa/dist/repositories/payment-session';
import RefundRepository from '@medusajs/medusa/dist/repositories/refund';
import {
	CustomerService,
	PaymentService,
} from '@medusajs/medusa/dist/services';
import { FlagRouter } from '@medusajs/utils';
import { BasePaymentService } from 'medusa-interfaces';
import { EntityManager } from 'typeorm';
import MyPaymentService from './my-payment';

type PaymentProviderKey = `pp_${string}` | 'systemPaymentProviderService';

type InjectedDependencies = {
	manager: EntityManager;
	paymentSessionRepository: typeof PaymentSessionRepository;
	paymentProviderRepository: typeof PaymentProviderRepository;
	paymentRepository: typeof PaymentRepository;
	refundRepository: typeof RefundRepository;
	paymentService: PaymentService;
	customerService: CustomerService;
	featureFlagRouter: FlagRouter;
	logger: Logger;
	myPaymentService: MyPaymentService;
} & {
	[key in `${PaymentProviderKey}`]:
		| AbstractPaymentService
		| typeof BasePaymentService;
};
export default class MyPaymentProviderService extends MedusaPaymentProviderService {
	protected readonly myPaymentService_: MyPaymentService;

	constructor(container: InjectedDependencies) {
		super(container);
		this.myPaymentService_ = container.myPaymentService;
	}

	async updateNewPayment(
		paymentId: string,
		data: { supplier_order_id?: string }
	): Promise<Payment> {
		return await this.atomicPhase_(async (transactionManager) => {
			return await this.myPaymentService_
				.withTransaction(transactionManager)
				.updateNewPayment(paymentId, data);
		});
	}
}
