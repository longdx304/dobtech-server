export type CreateSODocumentsInput = {
	supplier_order_id: string;
	document_url: string;
	metadata?: Record<string, unknown>;
};
