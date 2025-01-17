import { dataSource } from '@medusajs/medusa/dist/loaders/database';
import { ProductVariant } from '../models/product-variant';
import { WarehouseInventory } from '../models/warehouse-inventory';

const ProductVariantRepository = dataSource
	.getRepository(ProductVariant)
	.extend({
		async getTotalQuantityWithVariantDetails({
			q,
			skip,
			take,
		}: any): Promise<any> {
			const query = await this.createQueryBuilder('variant')
				.leftJoinAndSelect(
					WarehouseInventory,
					'wi',
					'wi.variant_id = variant.id'
				) // Kết nối với bảng `variant`
				.leftJoinAndSelect('variant.product', 'product') // Kết nối với bảng `product`
				.select('variant.id', 'variant_id')
				.addSelect(
					'CAST(COALESCE(SUM(wi.quantity), 0) AS INTEGER)',
					'total_quantity'
				)
				.addSelect(
					'variant.sku, variant.title AS variant_title, variant.inventory_quantity'
				)
				.addSelect(
					'product.id, product.title AS product_title, product.thumbnail, product.created_at'
				)
				.groupBy('variant.id')
				.addGroupBy('product.id')
				.addGroupBy('variant.inventory_quantity')
				.having(
					'CAST(COALESCE(SUM(wi.quantity), 0) AS INTEGER) != variant.inventory_quantity'
				)
				// .orderBy('product.created_at', 'DESC');

			if (q) {
				query.andWhere(
					`(LOWER(variant.sku) LIKE :q OR LOWER(variant.title) LIKE :q OR LOWER(product.title) LIKE :q)`,
					{ q: `%${q.toLowerCase()}%` }
				);
			}

			query.skip(skip).take(take);
			query.orderBy('product.created_at', 'DESC')
			const data = await query.getRawMany();

			return {
				data,
			};
		},
	});

export default ProductVariantRepository;
