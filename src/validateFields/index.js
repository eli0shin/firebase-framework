module.exports = schema => async (req, res, next) => {
  try {
    Object.entries(req.body).forEach(([key, value]) => {
      if (typeof schema[key] !== 'undefined' && !schema[key].readOnly) {
        if (Array.isArray(schema[key].type)) {
          if (!schema[key].type.includes(typeof value)) {
            throw new TypeError(
              `invalid value for ${key}, must be one of ${schema[key].type.join(
                ', '
              )}. found: ${typeof value}`
            );
          }
        } else {
          if (
            typeof value !== schema[key].type &&
            typeof schema[key].nullable !== 'undefined' &&
            !schema[key].nullable &&
            !(value === null)
          ) {
            throw new TypeError(
              `invalid value for ${key}, must be of type ${
                schema[key].type
              }. found ${typeof value}`
            );
          }
        }

        if (Array.isArray(schema[key].enum)) {
          if (!schema[key].enum.includes(value)) {
            throw new TypeError(`${value}: is not valid for key: ${key}`);
          }
        }

        if (typeof schema[key].validator === 'function') {
          if (!schema[key].validator(value, req.body, req)) {
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
      Object.keys(req.body).forEach(key => {
        if (schema[key].immutable) {
          delete req.body[key];
        }
      });
    }

    return next();
  } catch (error) {
    console.log(error);

    return res.status(400).send({
      status: 'error',
      error: error.message
    });
  }
};
