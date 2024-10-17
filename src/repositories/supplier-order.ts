import { ExtendedFindConfig } from '@medusajs/medusa';
import { dataSource } from '@medusajs/medusa/dist/loaders/database';
import { objectToStringPath } from '@medusajs/utils';
import { flatten, groupBy, map, merge } from 'lodash';

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

		const groupedRelations: { [topLevel: string]: string[] } = {};
		for (const rel of objectToStringPath(relations)) {
			const [topLevel] = rel.split('.');
			if (groupedRelations[topLevel]) {
				groupedRelations[topLevel].push(rel);
			} else {
				groupedRelations[topLevel] = [rel];
			}
		}

		const entitiesIdsWithRelations = await Promise.all(
			Object.entries(groupedRelations).map(async ([topLevel, rels]) => {
				// If top level is region or items then get deleted region as well
				return this.find({
					where: { id: In(entitiesIds) },
					select: ['id'],
					relations: rels,
					withDeleted:
						topLevel === ITEMS_REL_NAME || topLevel === REGION_REL_NAME,
					relationLoadStrategy: 'join',
				});
			})
		).then(flatten);

		const entitiesAndRelations = entitiesIdsWithRelations.concat(entities);

		const entitiesAndRelationsById = groupBy(entitiesAndRelations, 'id');

		return map(entities, (e) => merge({}, ...entitiesAndRelationsById[e.id]));
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
