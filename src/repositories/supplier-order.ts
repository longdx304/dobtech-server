import { ExtendedFindConfig } from '@medusajs/medusa';
import { dataSource } from '@medusajs/medusa/dist/loaders/database';
import {
	getGroupedRelations,
	mergeEntitiesWithRelations,
} from '@medusajs/medusa/dist/utils/repository';
import { objectToStringPath, promiseAll } from '@medusajs/utils';
import { flatten } from 'lodash';

import {
	FindManyOptions,
	FindOptionsRelations,
	FindOptionsWhere,
	ILike,
	In,
} from 'typeorm';
import { SupplierOrder } from '../models/supplier-order';

const ITEMS_REL_NAME = 'items';
const REGION_REL_NAME = 'region';

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

	async findWithRelations(
		relations: FindOptionsRelations<SupplierOrder> = {},
		optionsWithoutRelations: Omit<
			FindManyOptions<SupplierOrder>,
			'relations'
		> = {}
	): Promise<SupplierOrder[]> {
		const entities = await this.find(optionsWithoutRelations);
		const entitiesIds = entities.map(({ id }) => id);

		const groupedRelations = getGroupedRelations(objectToStringPath(relations));

		const entitiesIdsWithRelations = await promiseAll(
			Object.entries(groupedRelations).map(async ([topLevel, rels]) => {
				// If top level is region or items then get deleted region as well
				return this.find({
					where: { id: In(entitiesIds) },
					select: ['id'],
					relations: rels,
					withDeleted: [ITEMS_REL_NAME, REGION_REL_NAME].includes(topLevel),
					relationLoadStrategy: 'join',
				});
			})
		).then(flatten);

		const entitiesAndRelations = entities.concat(entitiesIdsWithRelations);
		return mergeEntitiesWithRelations<SupplierOrder>(entitiesAndRelations);
	},

	async findOneWithRelations(
		relations: FindOptionsRelations<SupplierOrder> = {},
		optionsWithoutRelations: Omit<
			FindManyOptions<SupplierOrder>,
			'relations'
		> = {}
	): Promise<SupplierOrder> {
		// Limit 1
		optionsWithoutRelations.take = 1;

		const result = await this.findWithRelations(
			relations,
			optionsWithoutRelations
		);

		return result[0];
	},
});

export default SupplierOrderRepository;
