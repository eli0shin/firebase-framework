import { NextFunction, Response } from 'express';
import { Request } from '../types/Request';
import { Schema } from '../types/Service';

export function setDefaults(
  schema: Schema,
  data: Record<string, unknown>,
  req: Request
) {
  return Promise.all(
    Object.entries(schema).map(async ([key, { default: defaultValue }]) => {
      if (
        typeof data[key] === 'undefined' &&
        typeof defaultValue !== 'undefined'
      ) {
        if (typeof defaultValue === 'function') {
          data[key] = await defaultValue(data, req);
        } else {
          data[key] = defaultValue;
        }
      }
    })
  );
}

export function middleware(schema: Schema) {
  return async function setDefaultsMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (req.method === 'POST') {
        await setDefaults(schema, req.body, req);
      }
      return next();
    } catch (error) {
      console.log(error);

      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? (error.message as string)
          : 'Internal Error';

      return res.status(500).send({
        status: 'error',
        error: message,
      });
    }
  };
}
