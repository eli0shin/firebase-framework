import { NextFunction, Response } from 'express';
import { Request } from '../types/Request';

export function isVisible(visibility: string | string[], mode: string) {
  return (
    !visibility ||
    visibility === mode ||
    (Array.isArray(visibility) && visibility.indexOf(mode) >= 0)
  );
}

function removeInvisibleValues<ReturnValue extends Record<string, unknown>>(
  mode: string,
  schema: Record<string, any>,
  returnValue: ReturnValue
) {
  const fields = Object.entries(returnValue);

  const modifiedValue = fields.reduce((acc, [key, value]) => {
    const visibility = schema[key] && schema[key].visibility;

    if (!visibility || isVisible(visibility, mode)) {
      acc[key] = value;
    }

    return acc;
  }, {} as Record<string, unknown>);

  return modifiedValue;
}

export type UnwrapResponse = <T extends Record<string, any>>(
  returnValue: T
) => [any, (modifiedReturnValue: any) => Partial<T>];
export function handleVisibility<ReturnValue extends Record<string, any>>(
  mode: string,
  schema: Record<string, unknown>,
  unwrapResponse: UnwrapResponse,
  returnValue: ReturnValue
) {
  const [unwrappedResponse, rewrapResponse] = unwrapResponse(returnValue);

  if (Array.isArray(unwrappedResponse)) {
    const modifiedValue = unwrappedResponse.map((value) =>
      removeInvisibleValues(mode, schema, value)
    );
    return rewrapResponse(modifiedValue);
  }

  const modifiedValue = removeInvisibleValues(mode, schema, unwrappedResponse);

  return rewrapResponse(modifiedValue);
}

export function validateVisibility(visibility: string | string[]) {
  return function visibilityMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!req.mode) {
      return next();
    }
    const { mode } = req;

    if (isVisible(visibility, mode)) {
      return next();
    }

    res.status(403).send({ status: 'unauthorized' });
  };
}
