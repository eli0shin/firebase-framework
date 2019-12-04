async function setDefaults(schema, data) {
  Object.entries(schema).forEach(([key, { default: defaultValue }]) => {
    if (
      typeof data[key] === 'undefined' &&
      typeof defaultValue !== 'undefined'
    ) {
      if (typeof defaultValue === 'function'){
        data[key] = await defaultValue(data);
      } else {
        data[key] = defaultValue;
      }
    }
  });
}

module.exports.setDefaults = setDefaults;

module.exports.middleware = schema => async (req, res, next) => {
  try {
    if (req.method === 'POST') {
      await setDefaults(schema, req.body);
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
