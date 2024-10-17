export default async function () {
  const imports = (await import(
    "@medusajs/medusa/dist/api/routes/admin/variants/index"
  )) as any

  imports.defaultAdminVariantFields = [
    ...imports.defaultAdminVariantFields,
    "supplier_price",
    "allowed_quantities",
  ]
}
