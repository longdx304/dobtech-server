import {
	AdminPriceListPricesCreateReq,
	AdminPriceListPricesUpdateReq,
	buildQuery,
	CreatePriceListInput,
	PriceListService as MedusaPriceListService,
	PriceListStatus,
	PriceListType,
} from '@medusajs/medusa';
import { PriceList } from './../models/price-list';
import { EntityManager } from 'typeorm';

type InjectedDependencies = {
	manager: EntityManager;
};

class PriceListService extends MedusaPriceListService {
	constructor({}: InjectedDependencies) {
		// eslint-disable-next-line prefer-rest-params
		super(arguments[0]);
	}

	async findOneByCustomerId(customerId: string): Promise<PriceList | null> {
		const priceListRepo = this.activeManager_.withRepository(
			this.priceListRepo_
		);

		const query = buildQuery({ customer_id: customerId }, {});
		const priceList = await priceListRepo.findOne(query);

		if (!priceList) {
			return null;
		}

		return priceList;
	}

	async upsertPrivatePriceList(
		customer: { id: string; name: string },
		prices: AdminPriceListPricesCreateReq | AdminPriceListPricesUpdateReq
	): Promise<PriceList | never> {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const priceList = await this.findOneByCustomerId(customer.id);

			// If the price list does not exist, create it
			if (!priceList) {
				const priceList_ = await this.create({
					name: customer.name,
					description: `Danh sách giá dành cho ${customer.name}`,
					type: PriceListType.OVERRIDE,
					prices: [prices],
					status: PriceListStatus.ACTIVE,
					customer_id: customer.id,
				} as CreatePriceListInput & { customer_id: string });

				return priceList_;
			}
			// If the price list exists, update it
			else {
				const priceList_ = await this.addPrices(priceList.id, [prices], true);
				return priceList_;
			}
		});
	}
}

export default PriceListService;
