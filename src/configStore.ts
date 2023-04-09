import { Config } from './types/Config';
import { UnwrapResponse, validateVisibility } from './visibility';

const defaultCorsOptions = {
  origin: true,
  methods: 'GET,PUT,POST,DELETE,OPTIONS',
  allowedHeaders: 'token, role, content-type',
};

const defaultValidatePrivilege: typeof validateVisibility =
  (_privilege) => (_req, _res, next) =>
    next();
const defaultValidateVisibility: typeof validateVisibility =
  (_visibility) => (_req, _res, next) =>
    next();
const defaultUnwrapResponse: UnwrapResponse = (response) => [
  response,
  (modifiedResponse) => modifiedResponse,
];

const defaultConfig = {
  region: 'us-central1',
  validatePrivilege: defaultValidatePrivilege,
  validateVisibility: defaultValidateVisibility as Config['validateVisibility'],
  unwrapResponse: defaultUnwrapResponse,
  middleware: [],
  corsEnabled: true,
  corsOptions: defaultCorsOptions,
} as Config;

export const config: Config = defaultConfig;

export function setConfig(config: Partial<Config>) {
  Object.assign(defaultConfig, config);
}
