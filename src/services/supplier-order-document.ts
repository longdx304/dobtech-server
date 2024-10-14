import { TransactionBaseService } from '@medusajs/medusa';
import SupplierOrderDocumentRepository from 'src/repositories/supplier-order-document';
import { CreateSODocumentsInput } from 'src/types/supplier-order-documents';
import { EntityManager } from 'typeorm';

type InjectedDependencies = {
	manager: EntityManager;
	supplierOrderDocumentRepository: typeof SupplierOrderDocumentRepository;
};

class SupplierOrderDocumentService extends TransactionBaseService {
	protected supplierOrderDocumentRepository_: typeof SupplierOrderDocumentRepository;

	constructor({ supplierOrderDocumentRepository }: InjectedDependencies) {
		super(arguments[0]);

		this.supplierOrderDocumentRepository_ = supplierOrderDocumentRepository;
	}

	/**
	 * Creates a new supplier order document.
	 *
	 * @param {CreateSODocumentsInput} data - The data to create the supplier order document with.
	 * @returns {Promise<SupplierOrderDocument>} The created supplier order document.
	 */
	async create(id: string, data: string[]) {
		const supplierOrderDocumentRepo = this.activeManager_.withRepository(
			this.supplierOrderDocumentRepository_
		);

		const supplierOrderDocuments = data.map((item) =>
			supplierOrderDocumentRepo.create({
				supplier_order_id: id,
				document_url: item,
			})
		);

		await supplierOrderDocumentRepo.save(supplierOrderDocuments);

		return supplierOrderDocuments;
	}

	async delete(id: string) {
		const supplierOrderDocumentRepo = this.activeManager_.withRepository(
			this.supplierOrderDocumentRepository_
		);

		const supplierOrderDocument = await supplierOrderDocumentRepo.findOne({
			where: { id },
		});

		if (!supplierOrderDocument) {
			throw new Error(`Đơn đặt hàng của ncc với: ${id} không tìm thấy`);
		}

		await supplierOrderDocumentRepo.remove(supplierOrderDocument);

		return true;
	}
}

export default SupplierOrderDocumentService;
