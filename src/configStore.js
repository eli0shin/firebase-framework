const defaultCorsOptions = {
  origin: true,
  methods: 'GET,PUT,POST,DELETE,OPTIONS',
  allowedHeaders: 'token, role, content-type',
};

const defaultValidatePrivilege = _privilege => (_req, _res, next) => next();

const defaultConfig = {
  region: 'us-central1',
  validatePrivilege: defaultValidatePrivilege,
  middleware: [],
  corsEnabled: true,
  corsOptions: defaultCorsOptions,
};

module.exports.config = defaultConfig;
