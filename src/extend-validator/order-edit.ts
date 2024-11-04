import { AdminPostOrderEditsEditLineItemsLineItemReq as MedusAdminPostOrderEditsEditLineItemsLineItemReq } from '@medusajs/medusa/dist/api/routes/admin/order-edits/update-order-edit-line-item';
import { IsNumber, IsOptional } from 'class-validator';

class AdminPostOrderEditsEditLineItemsLineItemReq extends MedusAdminPostOrderEditsEditLineItemsLineItemReq {
	@IsOptional()
	@IsNumber()
	unit_price?: number;
}

export { AdminPostOrderEditsEditLineItemsLineItemReq };
