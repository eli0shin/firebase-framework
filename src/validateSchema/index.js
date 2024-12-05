const rules = require('./rules');

module.exports = serviceConfig => {
  const {
    schema,
    postSchema = null,
    basePath,
  } = serviceConfig;

  if (schema) {
    console.log(validate(schema, basePath));
  }

  if (postSchema) {
    console.log(
      validate(postSchema, basePath, 'postSchema'),
    );
  }

  if (!schema && !postSchema) {
    console.log(`${basePath}: no schema provided`);
  }
};

function validate(schema, basePath, customName = null) {
  const { keyType, valueType, childTypes } = rules;

  try {
    Object.entries(schema).forEach(([key, config]) => {
      if (typeof key !== keyType) {
        throw new Error(`
          Key ${key} is of an invalid type. Expected 'string' but got ${typeof key}
        `);
      }

      if (typeof config !== valueType) {
        throw new Error(`
          Config for key: ${key} is of an invalid type. Expected an 'object' but got ${typeof config}
        `);
      }

      Object.entries(config).forEach(
        ([childKey, childValue]) => {
          if (typeof childTypes[childKey] === 'undefined') {
            throw new Error(`
              Invalid param '${childKey}' for field '${key}'.
            `);
          }

          if (Array.isArray(childTypes[childKey].type)) {
            if (
              !childTypes[childKey].type.includes(
                typeof childValue,
              )
            ) {
              throw new Error(`
                Invalid value '${childValue}' at '${childKey}' for field '${key}'.
              `);
            }
          } else if (
            typeof childValue !== childTypes[childKey].type
          ) {
            throw new Error(`
              Invalid value '${childValue}' at '${childKey}' for field '${key}'.
            `);
          }

          if (
            typeof childTypes[childKey].validator ===
            'function'
          ) {
            if (
              !childTypes[childKey].validator(childValue)
            ) {
              throw new Error(`
                Invalid value '${childValue}' at '${childKey}' for field '${key}'.
              `);
            }
          }

          if (Array.isArray(childTypes[childKey].enum)) {
            childTypes[childKey].enum.forEach(value => {
              if (
                typeof value !== childTypes[childKey].type
              ) {
                throw new Error(`
                  Invalid value '${childValue}' at '${childKey}' for field '${key}. enum values must be of field type ${
                  childTypes[childKey].type
                }'.
                `);
              }
            });
          }
        },
      );

      Object.entries(childTypes).forEach(
        ([typeKey, { required }]) => {
          if (
            required &&
            typeof config[typeKey] === 'undefined'
          ) {
            throw new Error(`
              Key '${typeKey}' is required at '${key}' but is missing'.
            `);
          }
        },
      );

      if (typeof config.type === 'object' && typeof config.childSchema !== 'undefined') {
        validate(config.childSchema, basePath, customName);
      }
    });

    return `${basePath}: ${customName ||
      'Schema'} validated successfully!`;
  } catch (error) {
    console.error(error);

    return `${basePath}: ${customName ||
      'Schema'} failed validation`;
  }
}
