import { Schema, SchemaField, ServiceConfiguration } from '../types/Service';
import {rules} from './rules';

export function validateSchema(serviceConfig: ServiceConfiguration) {
  const {
    schema,
    postSchema = null,
    basePath,
  } = serviceConfig;

  if (schema) {
    console.log(validate(schema, basePath));
  }

  if (postSchema) {
    console.log(
      validate(postSchema, basePath, 'postSchema'),
    );
  }

  if (!schema && !postSchema) {
    console.log(`${basePath}: no schema provided`);
  }
};

function validate(schema: Schema, basePath: string, customName: string | null = null) {
  const { keyType, valueType, childTypes } = rules;

  try {
    Object.entries(schema).forEach(([key, config]) => {
      if (typeof key !== keyType) {
        throw new Error(`
          Key ${key} is of an invalid type. Expected 'string' but got ${typeof key}
        `);
      }

      if (typeof config !== valueType) {
        throw new Error(`
          Config for key: ${key} is of an invalid type. Expected an 'object' but got ${typeof config}
        `);
      }

      (Object.entries(config) as [keyof SchemaField, SchemaField[keyof SchemaField]][]).forEach(
        ([childKey, childValue]) => {
          const schemaFieldRule = childTypes[childKey]
          if (typeof schemaFieldRule === 'undefined') {
            throw new Error(`
              Invalid param '${childKey}' for field '${key}'.
            `);
          }

          if (Array.isArray(schemaFieldRule.type)) {
            if (
              !schemaFieldRule.type.includes(
                typeof childValue,
              )
            ) {
              throw new Error(`
                Invalid value '${childValue}' at '${childKey}' for field '${key}'.
              `);
            }
          } else if (
            typeof childValue !== schemaFieldRule.type
          ) {
            throw new Error(`
              Invalid value '${childValue}' at '${childKey}' for field '${key}'.
            `);
          }

          if (
            'validator' in schemaFieldRule &&
            typeof schemaFieldRule.validator ===
            'function'
          ) {
            if (
              !schemaFieldRule.validator(childValue)
            ) {
              throw new Error(`
                Invalid value '${childValue}' at '${childKey}' for field '${key}'.
              `);
            }
          }

          if ( 'enum' in schemaFieldRule && Array.isArray(schemaFieldRule.enum)) {
            schemaFieldRule.enum.forEach(value => {
              if (
                typeof value !== schemaFieldRule.type
              ) {
                throw new Error(`
                  Invalid value '${childValue}' at '${childKey}' for field '${key}. enum values must be of field type ${
                  schemaFieldRule.type
                }'.
                `);
              }
            });
          }
        },
      );

      Object.entries(childTypes).forEach(
        ([typeKey, { required }]) => {
          if (
            required &&
            !(typeKey in config)
          ) {
            throw new Error(`
              Key '${typeKey}' is required at '${key}' but is missing'.
            `);
          }
        },
      );
    });

    return `${basePath}: ${customName ||
      'Schema'} validated successfully!`;
  } catch (error) {
    console.error(error);

    return `${basePath}: ${customName ||
      'Schema'} failed validation`;
  }
}
