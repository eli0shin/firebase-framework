import { NextFunction, Response } from 'express';
import { Request } from '../types/Request';
import { Schema, SchemaField } from '../types/Service';

function formatExpectedType(field: SchemaField): string {
  if (Array.isArray(field.type)) {
    field.type.join(', ')
  }
  return field.type;
}

export default (schema: Schema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      Object.entries(req.body).forEach(([key, value]) => {
        const schemaField = schema[key];
        if (typeof schemaField !== 'undefined' && !schemaField.readOnly) {
          if (Array.isArray(schemaField.type)) {
            if (!schemaField.type.includes(typeof value)) {
              throw new TypeError(
                `invalid value for ${key}, must be one of ${formatExpectedType(schema[
                  key
                ])}. found: ${typeof value}`
              );
            }
          } else {
            if (
              typeof value !== schemaField.type &&
              typeof schemaField.nullable !== 'undefined' &&
              !schemaField.nullable &&
              !(value === null)
            ) {
              throw new TypeError(
                `invalid value for ${key}, must be of type ${
                  schemaField.type
                }. found ${typeof value}`
              );
            }
          }

          if (Array.isArray(schemaField.enum)) {
            if (!schemaField.enum.includes(String(value))) {
              throw new TypeError(`${value}: is not valid for key: ${key}`);
            }
          }

          if (typeof schemaField.validator === 'function') {
            if (!schemaField.validator(value, req.body, req)) {
              throw new TypeError(`${value}: is not valid for key: ${key}`);
            }
          }
        } else {
          // if the field is not writable delete it
          delete req.body[key];
        }
      });

      if (req.method === 'POST') {
        Object.entries(schema).forEach(([key, { required }]) => {
          const isRequired =
            typeof required === 'function' ? required(req.body, req) : required;
          if (typeof req.body[key] === 'undefined' && isRequired) {
            throw new TypeError(`${key} is required and missing`);
          }
        });
      }

      if (req.method === 'PUT') {
        Object.keys(req.body).forEach((key) => {
          if (schema[key].immutable) {
            delete req.body[key];
          }
        });
      }

      return next();
    } catch (error) {
      console.log(error);

      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? error.message
          : 'Internal Error';

      return res.status(400).send({
        status: 'error',
        error: message,
      });
    }
  };
