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

	async create(data: CreateSODocumentsInput) {
		const supplierOrderDocumentRepo = this.activeManager_.withRepository(
			this.supplierOrderDocumentRepository_
		);

		const supplierOrderDocument = supplierOrderDocumentRepo.create(data);

		await supplierOrderDocumentRepo.save(supplierOrderDocument);

		return supplierOrderDocument;
	}
}

export default SupplierOrderDocumentService;
