const applyModifiers = ({
  schema,
  postSchema = null,
  withModifiers = false,
}) => (req, res, next) => {
  if (withModifiers) {
    const method = req.method.toLowerCase();

    const currentSchema =
      method === 'post' && postSchema ? postSchema : schema;

    if (method !== 'get') {
      Object.entries(req.body).forEach(([key, _value]) => {
        if (
          currentSchema[key] &&
          'writeModifier' in currentSchema[key]
        ) {
          req.body[key] = currentSchema[key].writeModifier(
            req.body[key],
            req.body,
          );
        }
      });
    }
  }

  return next();
};

module.exports = applyModifiers;
