export type CreateItemUnit = {
	unit: string;
	quantity: number;
};

export type UpdateItemUnit = Partial<CreateItemUnit>;
