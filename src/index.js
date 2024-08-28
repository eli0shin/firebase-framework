const createFunctions = require('./createFunctions');
const generateTypes = require('./generateTypes');
const validateSchema = require('./validateSchema');
const setDefaults = require('./validateFields/setDefaults').setDefaults;
const applyModifiers = require('./validateFields/applyModifiers')
  .applyModifiers;
const iFC = require('./iFC.js');
const publish = require('./pubSub/publish');

module.exports = require('./v2');

module.exports.default = createFunctions;
module.exports.createFunctions = createFunctions;
module.exports.generateTypes = generateTypes;
module.exports.validateSchema = validateSchema;
module.exports.setDefaults = setDefaults;
module.exports.applyModifiers = applyModifiers;
module.exports.iFC = iFC;
module.exports.publish = publish;
