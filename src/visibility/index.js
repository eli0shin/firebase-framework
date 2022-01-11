function isVisible(visibility, mode) {
  return (
  !visibility ||
  visibility === mode ||
  (Array.isArray(visibility) && visibility.indexOf(mode) >= 0))

}

function handleVisibility(mode, config, returnValue) {
  const { schema } = config;

  const fields = Object.entries(returnValue);

  const modifiedValue = fields.reduce((acc, [key, value]) => {
    const { visibility } = schema[key];

    if (isVisible(visibility, mode)) {
      acc[key] = value;
    }

    return acc;
  }, {});

  return modifiedValue;
}

module.exports.handleVisibility = handleVisibility;

function validateVisibility(visibility) {
  return function visibilityMiddleware(req, res, next) {
    if (!req.mode) {
      return next();
    }
    const { mode } = req;

    if (isVisible(visibility, mode)) {
      return next();
    }

    res.status(403).send({ status: 'unauthorized' });
  }
}

module.exports.validateVisibility = validateVisibility;
