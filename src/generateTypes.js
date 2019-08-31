const fs = require('fs');

function capitalize(str) {
  const [first, ...rest] = str;

  return `${first.toUpperCase()}${rest.join('')}`;
}

function makeSingular(str) {
  if (str[str.length - 1] === 's') {
    return str.substring(0, str.length - 1);
  }
  return str;
}

function typeName(name) {
  const singular = makeSingular(name);
  const split = singular.split('_');
  const camelcased = split.map(capitalize);

  return camelcased.join('');
}

function generateTypes(service) {
  const { schema, basePath } = service;
  if (!schema) return '';
  const schemaAsArray = Object.entries(schema);

  const types = schemaAsArray.map(
    ([key, { type, enum: possible, required }]) =>
      `${key}: ${makeType(type, possible, required)},`,
  );

  return `
declare type ${typeName(basePath)} = {
  ${types.join('\n  ')}
}
`;
}

function makeType(type, possible, required) {
  if (possible) {
    if (type === 'number') {
      const possibles = possible.join(' | ');
      return required ? possibles : `${possibles} | null`;
    }
    return `${'"'}${possible.join('" | "')}${'"'}${!required ? ' | null' : ''}`;
  }
  return required ? type : `${type} | null`;
}

module.exports = function createTypes(services, path) {
  const types = services.map(generateTypes).join('\n');

  const typeFile = `
/* @flow */

${types}
`;

  fs.writeFileSync(path, typeFile);
};
