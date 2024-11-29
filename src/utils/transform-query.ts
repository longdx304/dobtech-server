import {
	BaseEntity,
	ClassConstructor,
	QueryConfig,
	removeUndefinedProperties,
	validator,
} from '@medusajs/medusa';
import { omit } from 'lodash';
import { prepareListQuery, prepareRetrieveQuery } from './get-query-config';

/**
 * Utility to transform query input for list or retrieve endpoints.
 */
export async function transformQuery<
	T extends Record<string, any>,
	TEntity extends BaseEntity
>(
	plainToClass: ClassConstructor<T>,
	query: Record<string, unknown>,
	queryConfig: QueryConfig<TEntity> = {}
): Promise<{
	validatedQuery: T;
	filterableFields: Partial<T>;
	listConfig?: Record<string, any>;
	retrieveConfig?: Record<string, any>;
}> {
	// Validate the incoming query using the provided class
	const validated: T = await validator<T, Record<string, unknown>>(
		plainToClass,
		query
	);

	// Extract filterable fields by removing non-filterable ones
	const filterableFields = getFilterableFields(validated);

	// Prepare configuration for list or retrieve operations
	const isList = queryConfig.isList ?? true; // Default to list config
	const config = isList
		? prepareListQuery(validated, queryConfig)
		: prepareRetrieveQuery(validated, queryConfig);

	const listConfig = 'listConfig' in config ? config.listConfig : undefined;
	const retrieveConfig =
		'retrieveConfig' in config ? config.retrieveConfig : undefined;

	return {
		validatedQuery: validated,
		filterableFields,
		listConfig,
		retrieveConfig,
	};
}

/**
 * Extracts only filterable fields from the query object.
 * Filters out `limit`, `offset`, `expand`, `fields`, and `order`.
 */
function getFilterableFields<T extends Record<string, any>>(
	obj: T
): Partial<T> {
	return removeUndefinedProperties(
		omit(obj, ['limit', 'offset', 'expand', 'fields', 'order'])
	);
}
