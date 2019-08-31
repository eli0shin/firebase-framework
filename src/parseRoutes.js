const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const validateFields = require("./validateFields");
const setDefaults = require("./validateFields/setDefaults");
const applyModifiers = require("./validateFields/applyModifiers");

const defaultCorsOptions = {
  origin: true,
  methods: "GET,PUT,POST,DELETE,OPTIONS",
  allowedHeaders: "token, role, content-type"
};

const defaultValidatePrivilege = _privilege => (_req, _res, next) => next();

module.exports = ({
  validatePrivilege = defaultValidatePrivilege,
  middleware = [],
  corsEnabled = true,
  corsOptions = defaultCorsOptions
}) => config => {
  const { routes, schema, postSchema = null } = config;

  const app = express();

  app.use(helmet());
  app.disable("x-powered-by");
  if (corsEnabled) {
    app.options("*", cors(corsOptions));
    app.use(cors(corsOptions));
  }
  app.use(express.json());

  routes.forEach(
    ({
      path,
      method,
      function: toExecute,
      privilege = "any",
      ignoreBody = false
    }) => {
      if (ignoreBody) {
        app[method](
          `${path}`,
          validatePrivilege(privilege),
          ...middleware,
          handleRequest(privilege, toExecute)
        );
      } else if (method === "post" && (postSchema || schema)) {
        app[method](
          `${path}`,
          validatePrivilege(privilege),
          validateFields(postSchema || schema),
          setDefaults(schema),
          applyModifiers(config),
          ...middleware,
          handleRequest(privilege, toExecute)
        );
      } else if (method === "put" && schema) {
        app[method](
          `${path}`,
          validatePrivilege(privilege),
          validateFields(schema),
          applyModifiers(config),
          ...middleware,
          handleRequest(privilege, toExecute)
        );
      } else {
        app[method](
          `${path}`,
          validatePrivilege(privilege),
          applyModifiers(config),
          ...middleware,
          handleRequest(privilege, toExecute)
        );
      }
    }
  );

  return app;
};

const withResponse = handler => async (req, res) => {
  try {
    const result = await handler(req, res);
    if (!Array.isArray(result)) return res.end();

    const [status, message, headers = {}] = result;

    return res
      .status(status)
      .set(headers)
      .send(message);
  } catch (error) {
    console.log(error);
    return res
      .status(error.statusCode || 500)
      .send({ status: "error", error: error.message });
  }
};

const handleRequest = (privilege, callback) => (req, res) =>
  withResponse(getHandlerForRole(privilege, callback, req))(req, res);

const getHandlerForRole = (privilege, callback, req) => {
  if (typeof privilege !== "object") {
    return callback;
  }
  if (req.headers.role && typeof req.headers.role === "function") {
    return req.headers.role;
  }
  if (typeof privilege.any === "function") {
    return privilege.any;
  }
  return sendError;
};
// typeof privilege === "object"
//   ? req.headers.role
//     ? privilege[req.headers.role]
//     : typeof privilege.any === "function"
//     ? privilege.any
//     : sendError
//   : callback;

const sendError = (_req, res) =>
  res.status(500).send({ status: "error", error: "internal error" });
