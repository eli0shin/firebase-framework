import { RuntimeOptions, SUPPORTED_REGIONS } from 'firebase-functions';
import { Request } from './Request';
import { Response, NextFunction } from 'express';
import { UnwrapResponse } from '../visibility';

type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'options'
  | 'head'
  | 'patch';
type METHODS = HttpMethod | Uppercase<HttpMethod>;

export type ValidatePrivilege = (
  privilege: string | undefined
) => (req: Request, res: Response, next: NextFunction) => void;
export type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

export type Config = {
  /**
   * GCP region in which to deploy functions. Valid values are listed here: https://firebase.google.com/docs/functions/locations
   */
  region: typeof SUPPORTED_REGIONS[number];
  /**
   * A function that accepts a privilege and returns an expressJs middleware function to validate whether the client has the correct privilege for the request
   */
  validatePrivilege: ValidatePrivilege;
  validateVisibility: ValidatePrivilege;
  unwrapResponse?: UnwrapResponse;
  /**
   * An array of expressJs middleware to be added to all routes across all services
   */
  middleware?: Middleware[];
  runtimeOptions?: RuntimeOptions;
  /**
   * whether the expressJs cors middleware should be enabled https://www.npmjs.com/package/cors
   */
  corsEnabled?: boolean;
  /**
   * expressJs cors middleware options https://www.npmjs.com/package/cors#configuring-cors
   */
  corsOptions?: {
    origin: boolean | string | RegExp | (string | RegExp)[];
    methods: string;
    allowedHeaders: string;
  };
};
