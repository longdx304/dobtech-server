import {
  Address,
  AddressCreatePayload,
  Customer,
  CustomerService as MedusaCustomerService
} from '@medusajs/medusa';
import { EntityManager } from 'typeorm';

type InjectedDependencies = {
	manager: EntityManager;
};
class CustomerService extends MedusaCustomerService {
	protected manager_: EntityManager;

	constructor({}: InjectedDependencies) {
		super(arguments[0]);
	}

	async adminAddCustomerAddress(
		customerId: string,
		address: AddressCreatePayload
	): Promise<Customer | Address> {
		return await this.atomicPhase_(async (manager) => {
			const addressRepository = manager.withRepository(this.addressRepository_);

			address.country_code = address.country_code.toLowerCase();

			const customer = await this.retrieve(customerId, {
				relations: ['shipping_addresses'],
			});

			const shouldAdd = !customer.shipping_addresses.find(
				(a) =>
					a.country_code?.toLowerCase() ===
						address.country_code.toLowerCase() &&
					a.address_1 === address.address_1 &&
					a.address_2 === address.address_2 &&
					a.city === address.city &&
					a.phone === address.phone &&
					a.postal_code === address.postal_code &&
					a.province === address.province &&
					a.first_name === address.first_name &&
					a.last_name === address.last_name
			);

			if (shouldAdd) {
				const created = addressRepository.create({
					...address,
					customer_id: customerId,
				});
				const result = await addressRepository.save(created);
				return result;
			} else {
				return customer;
			}
		});
	}
}

export default CustomerService;
