module.exports = schema => async (req, res, next) => {
  try {
    if (req.method === 'POST') {
      Object.entries(schema).forEach(
        ([key, { default: defaultValue }]) => {
          if (
            typeof req.body[key] === 'undefined' &&
            typeof defaultValue !== 'undefined'
          ) {
            req.body[key] = defaultValue;
          }
        },
      );
    }

    return next();
  } catch (error) {
    console.log(error);

    return res.status(500).send({
      status: 'error',
      error: error.message || 'Internal Error',
    });
  }
};
