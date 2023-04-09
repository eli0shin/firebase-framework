import { Response } from 'express';
import { Config } from './types/Config';
import { Request } from './types/Request';
import { RouteHandler, Schema, ServiceConfiguration } from './types/Service';
import { UnwrapResponse } from './visibility';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const validateFields = require('./validateFields');
const setDefaults = require('./validateFields/setDefaults').middleware;
const applyModifiers = require('./validateFields/applyModifiers').middleware;
const { handleVisibility, isVisible } = require('./visibility');

export default (
  {
    validatePrivilege,
    validateVisibility,
    unwrapResponse: configUnwrapResponse,
    middleware = [],
    corsEnabled,
    corsOptions,
  }: Config,
  service: ServiceConfiguration
) => {
  const {
    routes,
    schema,
    postSchema = null,
    middleware: serviceMiddleware = [],
    keepAlive = false,
  } = service;

  const app = express();

  app.use(helmet());
  app.disable('x-powered-by');
  if (corsEnabled) {
    app.options('*', cors(corsOptions));
    app.use(cors(corsOptions));
  }
  app.use(express.json());

  if (keepAlive) {
    app.get('/heartbeat', (_req: Request, res: Response) =>
      res.status(200).send({ status: 'success' })
    );
  }

  const router = new express.Router();
  if (routes) {
    routes.forEach(
      ({
        path,
        method,
        function: toExecute,
        privilege = 'any',
        ignoreBody = false,
        schema: routeSchema = null,
        middleware: routeMiddleware = [],
        visibility,
        unwrapResponse: routeUnwrapResponse,
      }) => {
        const unwrapResponse = routeUnwrapResponse || configUnwrapResponse;

        if (ignoreBody) {
          router[method](
            `${path}`,
            validatePrivilege(privilege),
            validateVisibility(visibility),
            ...middleware,
            ...serviceMiddleware,
            ...routeMiddleware,
            handleRequest(
              privilege,
              visibility,
              schema,
              unwrapResponse,
              toExecute
            )
          );
        } else if (method === 'post' && (routeSchema || postSchema || schema)) {
          router[method](
            `${path}`,
            validatePrivilege(privilege),
            validateVisibility(visibility),
            ...middleware,
            ...serviceMiddleware,
            ...routeMiddleware,
            validateFields(routeSchema || postSchema || schema),
            setDefaults(schema),
            applyModifiers(service),
            handleRequest(
              privilege,
              visibility,
              schema,
              unwrapResponse,
              toExecute
            )
          );
        } else if (method === 'put' && (routeSchema || schema)) {
          router[method](
            `${path}`,
            validatePrivilege(privilege),
            validateVisibility(visibility),
            ...middleware,
            ...serviceMiddleware,
            ...routeMiddleware,
            validateFields(routeSchema || schema),
            applyModifiers(service),
            handleRequest(
              privilege,
              visibility,
              schema,
              unwrapResponse,
              toExecute
            )
          );
        } else {
          router[method](
            `${path}`,
            validatePrivilege(privilege),
            validateVisibility(visibility),
            ...middleware,
            ...serviceMiddleware,
            ...routeMiddleware,
            applyModifiers(service),
            handleRequest(
              privilege,
              visibility,
              schema,
              unwrapResponse,
              toExecute
            )
          );
        }
      }
    );
  }
  app.use(`/${service.basePath}`, router);
  app.use('/', router);

  return app;
};

const withResponse =
  (
    schema: Schema | undefined,
    handler: RouteHandler,
    unwrapResponse: UnwrapResponse | undefined
  ) =>
  async (req: Request, res: Response) => {
    try {
      const result = await handler(req, res);
      if (!Array.isArray(result)) return res.end();

      const [status, message, headers = {}] = result;

      const messageWithVisibility = req.mode
        ? handleVisibility(req.mode, schema, unwrapResponse, message)
        : message;

      return res.status(status).set(headers).send(messageWithVisibility);
      // @ts-ignore
    } catch (error: Error & { statusCode?: number }) {
      console.error(error);
      return res
        .status(error?.statusCode || 500)
        .send({ status: 'error', error: error?.message });
    }
  };

const handleRequest =
  (
    privilege: string | Record<string, RouteHandler>,
    visibility: string | undefined,
    schema: Schema | undefined,
    unwrapResponse: UnwrapResponse | undefined,
    callback: RouteHandler
  ) =>
  (req: Request, res: Response) =>
    withResponse(
      schema,
      getHandlerForRole(privilege, visibility, callback, req),
      unwrapResponse
    )(req, res);

const getHandlerForRole = (
  privilege: string | Record<string, RouteHandler>,
  visibility: string | undefined,
  callback: RouteHandler,
  req: Request
): RouteHandler => {
  if (req.mode && !isVisible(visibility, req.mode)) {
    console.error(
      'rejecting request due to lack of visibility',
      visibility,
      req.mode
    );
    return sendError;
  }
  if (typeof privilege !== 'object') {
    return callback;
  }
  // if req.headers.role is an array, get the first entry
  const role = Array.isArray(req.headers.role)
    ? req.headers.role[0]
    : req.headers.role;

  if (role && typeof privilege[role] === 'function') {
    return privilege[role];
  }
  if (typeof privilege.any === 'function') {
    return privilege.any;
  }
  console.error(
    'rejecting request due to lack of privilege',
    privilege,
    visibility,
    req.headers.role
  );
  return sendError;
};

const sendError = (_req: Request, res: Response) => {
  res.status(500).send({ status: 'error', error: 'internal error' });
};
