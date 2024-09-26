import { dataSource } from '@medusajs/medusa/dist/loaders/database';
import { SupplierOrder } from '../models/supplier-order';
import {
	FindManyOptions,
	FindOptionsRelations,
	FindOptionsWhere,
	ILike,
	In,
} from 'typeorm';
import { flatten, groupBy, map, merge } from 'lodash';
import { ExtendedFindConfig } from '@medusajs/medusa';

const SupplierOrderRepository = dataSource.getRepository(SupplierOrder).extend({
	async listAndCount(
		query: ExtendedFindConfig<SupplierOrder>,
		q?: string
	): Promise<[SupplierOrder[], number]> {
		const query_ = { ...query };
		query_.relationLoadStrategy = 'query';
		query_.where = query.where as FindOptionsWhere<any>;

		if (q) {
			query_.where = query_.where ?? {};
			query_.where = [
				{
					...query_.where,
					supplier: {
						supplier_name: ILike(`%${q}%`),
					},
				},
				{
					...query_.where,
					supplier: {
						email: ILike(`%${q}%`),
					},
				},
				{
					...query_.where,
					user: {
						email: ILike(`%${q}%`),
					},
				},
			];
		}
		return await this.findAndCount(query_);
	},
});

export default SupplierOrderRepository;
