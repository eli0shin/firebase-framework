const middleware = ({ schema, postSchema = null, withModifiers = false }) => (
  req,
  res,
  next
) => {
  if (withModifiers) {
    const method = req.method.toLowerCase();

    const currentSchema = method === 'post' && postSchema ? postSchema : schema;

    if (method !== 'get') {
      applyModifiers(currentSchema, req.body, req);
    }
  }

  return next();
};

module.exports.middleware = middleware;

function applyModifiers(schema, data, req) {
  Object.entries(data).forEach(([key, _value]) => {
    if (schema[key] && 'writeModifier' in schema[key]) {
      data[key] = schema[key].writeModifier(data[key], data, req);
    }
  });
}

module.exports.applyModifiers = applyModifiers;
