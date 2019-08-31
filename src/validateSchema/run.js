const validateSchema = require('./');
const services = require('../../../services');

services.forEach(config => validateSchema(config));
