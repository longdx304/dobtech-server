export default async function () {
  const imports = (await import(
    "@medusajs/medusa/dist/types/orders"
  )) as any
  imports.defaultAdminOrdersFields = [
    ...imports.defaultAdminOrdersFields,
    "handler_id",
  ]
	imports.defaultAdminOrdersRelations = [
		...imports.defaultAdminOrdersRelations,
		"handler",
	]
}
