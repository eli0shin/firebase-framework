function isVisible(visibility, mode) {
  return (
    !visibility ||
    visibility === mode ||
    (Array.isArray(visibility) && visibility.indexOf(mode) >= 0)
  );
}

function removeInvisibleValues(mode, schema, returnValue) {
  const fields = Object.entries(returnValue);

  const modifiedValue = fields.reduce((acc, [key, value]) => {
    const visibility = schema[key] && schema[key].visibility;

    if (!visibility || isVisible(visibility, mode)) {
      acc[key] = value;
    }

    return acc;
  }, {});

  return modifiedValue;
}

function handleVisibility(mode, schema, unwrapResponse, returnValue) {
  const [unwrappedResponse, rewrapResponse] = unwrapResponse(returnValue);
  
  if (Array.isArray(unwrappedResponse)) {
    const modifiedValue = unwrappedResponse.map((value) =>
      removeInvisibleValues(mode, schema, value)
    );
    return rewrapResponse(modifiedValue);
  }

  const modifiedValue = removeInvisibleValues(mode, schema, unwrappedResponse);

  return rewrapResponse(modifiedValue);
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
  };
}

module.exports.validateVisibility = validateVisibility;
module.exports.isVisible = isVisible;
