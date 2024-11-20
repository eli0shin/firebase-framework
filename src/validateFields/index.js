const validateFields = (schema) => (req, res) => {
    Object.entries(req.body).forEach(([key, value]) => {
      // if the schema[key] is not writable delete it
      if (!schema[key] || schema[key].readOnly) {
        delete req.body[key]; 
        return;
      }

      if (Array.isArray(schema[key].type)) {
        if (!schema[key].type.includes(typeof value)) {
          throw new TypeError(
            `Invalid value for ${key}, must be one of ${schema[key].type.join(', ')}. Found: ${typeof value}`
          );
        }
      } else if (
        typeof value !== schema[key].type &&
        (!schema[key].nullable || value !== null)
      ) {
        throw new TypeError(`Invalid value for ${key}, must be of type ${schema[key].type}. Found: ${typeof value}`);
      }

      if (
        schema[key].type === 'object' && 
        typeof schema[key].childSchema === 'object' &&
        (!schema[key].nullable || value !== null)
      ) {
        const newReq = { ...req, body: { ...req.body[key] } };
        validateFields(schema[key].childSchema)(newReq, res);
      }

      if (Array.isArray(schema[key].enum) && !schema[key].enum.includes(value)) {
        throw new TypeError(`${value}: is not valid for key: ${key}`);
      }

      if (typeof schema[key].validator === 'function' && !schema[key].validator(value, req.body, req)) {
        throw new TypeError(`${value}: is not valid for key: ${key}`);
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
      Object.keys(req.body).forEach(key => {
        if (schema[key].immutable) {
          delete req.body[key];
        }
      });
    }
};

module.exports = (schema) => async (req, res, next) => {
  try {
    validateFields(schema)(req, res);
    return next();
  } catch (error) {
    console.log(error);

    return res.status(400).send({
      status: 'error',
      error: error.message,
    });
  }
};
