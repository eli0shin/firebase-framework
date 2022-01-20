const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const validateFields = require('./validateFields');
const setDefaults = require('./validateFields/setDefaults').middleware;
const applyModifiers = require('./validateFields/applyModifiers').middleware;
const { handleVisibility, isVisible } = require('./visibility');

module.exports = (
  {
    validatePrivilege,
    validateVisibility,
    unwrapResponse: configUnwrapResponse,
    middleware,
    corsEnabled,
    corsOptions,
  },
  service
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
    app.get('/heartbeat', (_, res) =>
      res.status(200).send({ status: 'success' })
    );
  }

  const router = new express.Router();

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
          handleRequest(privilege, visibility, schema, unwrapResponse, toExecute)
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
          handleRequest(privilege, visibility, schema, unwrapResponse, toExecute)
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
          handleRequest(privilege, visibility, schema, unwrapResponse, toExecute)
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
          handleRequest(privilege, visibility, schema, unwrapResponse, toExecute)
        );
      }
    }
  );

  app.use(`/${service.basePath}`, router);
  app.use('/', router);

  return app;
};

const withResponse = (schema, handler, unwrapResponse) => async (req, res) => {
  try {
    const result = await handler(req, res);
    if (!Array.isArray(result)) return res.end();

    const [status, message, headers = {}] = result;

    const messageWithVisibility = req.mode
      ? handleVisibility(req.mode, schema, unwrapResponse, message)
      : message;

    return res.status(status).set(headers).send(messageWithVisibility);
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .send({ status: 'error', error: error.message });
  }
};

const handleRequest = (privilege, visibility, schema, unwrapResponse, callback) => (req, res) =>
  withResponse(schema, getHandlerForRole(privilege, visibility, callback, req), unwrapResponse)(
    req,
    res
  );

const getHandlerForRole = (privilege, visibility, callback, req) => {
  if (!isVisible(visibility, req.mode)) {
    return sendError;
  }
  if (typeof privilege !== 'object') {
    return callback;
  }
  if (req.headers.role && typeof privilege[req.headers.role] === 'function') {
    return privilege[req.headers.role];
  }
  if (typeof privilege.any === 'function') {
    return privilege.any;
  }
  return sendError;
};

const sendError = (_req, res) =>
  res.status(500).send({ status: 'error', error: 'internal error' });
