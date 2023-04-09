import { NextFunction, Response } from 'express';
import { Request } from '../types/Request';
import { Schema } from '../types/Service';

type MiddlewareOptions = {
  schema: Schema;
  postSchema?: Schema;
  withModifiers?: boolean;
};

export const middleware =
  ({ schema, postSchema, withModifiers = false }: MiddlewareOptions) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (withModifiers) {
      const method = req.method.toLowerCase();

      const currentSchema =
        method === 'post' && postSchema ? postSchema : schema;

      if (method !== 'get') {
        applyModifiers(currentSchema, req.body, req);
      }
    }

    return next();
  };

module.exports.middleware = middleware;

export function applyModifiers(
  schema: Schema,
  data: Record<string, unknown>,
  req: Request
) {
  Object.entries(data).forEach(([key, _value]) => {
    const schemaKey = schema[key];
    if (
      schemaKey &&
      'writeModifier' in schemaKey &&
      typeof schemaKey.writeModifier === 'function'
    ) {
      data[key] = schemaKey.writeModifier(data[key], data, req);
    }
  });
}
