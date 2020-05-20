function setDefaults(schema, data, req) {
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

module.exports.setDefaults = setDefaults;

module.exports.middleware = schema => async (req, res, next) => {
  try {
    if (req.method === 'POST') {
      await setDefaults(schema, req.body, req);
    }
    return next();
  } catch (error) {
    console.log(error);

    return res.status(500).send({
      status: 'error',
      error: error.message || 'Internal Error'
    });
  }
};
