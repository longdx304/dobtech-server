export default async function () {
	const imports = (await import(
		'@medusajs/medusa/dist/api/routes/admin/price-lists/index'
	)) as any;

	imports.defaultAdminPriceListFields = [
		...imports.defaultAdminPriceListFields,
		'customer_id',
	];

	imports.defaultAdminPriceListRelations = [
		...imports.defaultAdminPriceListRelations,
		'customer',
	];
}
