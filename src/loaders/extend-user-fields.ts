export default async function () {
  const imports = (await import(
    "@medusajs/medusa/dist/api/routes/admin/users/index"
  )) as any
  // imports.allowedStoreUsersFields = [
  //   ...imports.allowedStoreUsersFields,
  //   "phone",
  //   "permissions",
  // ]
  imports.defaultAdminUserFields = [
    ...imports.defaultAdminUserFields,
    "phone",
    "permissions",
  ]
}