const axios = require('axios');
const configStore = require('./configStore');

const defaultOptions = {
  url: '',
  headers: {},
};

/**
 * Inter-Function-Communicator
 * given a service name, it can trigger http events and return responses
 * technically very similar to using axios to trigger the event
 * the difference is that the path to the service is generated dynamically
 *
 * @param {service} String - the name of the service to call
 * @param {options} Object - req params including:
 *   {url} String to call on the service
 *   {headers} Object to be passed as headers
 *   and other properties to be attached to the req (possible body)
 * @param {req} Object - the req object passed the the function calling i_f_c
 *   used to pass through required prams including auth information to the remote service
 */
async function ifc(service, options = defaultOptions, req = {}) {
  const {
    X_GOOGLE_GCP_PROJECT,
    X_GOOGLE_FUNCTION_REGION,
    NODE_ENV,
    FIREBASE_CONFIG,
    FUNCTIONS_EMULATOR,
    IS_FIREBASE_CLI,
  } = process.env;
  const firebaseConfig =
    typeof FIREBASE_CONFIG === 'string' ? JSON.parse(FIREBASE_CONFIG) : {};

  const { region } = configStore.config;

  const isLocalhost =
    NODE_ENV !== 'production' ||
    FUNCTIONS_EMULATOR === 'true' ||
    IS_FIREBASE_CLI === 'true';

  const port = process.env.PORT || 5000;

  const { headers: { host = `localhost:${port}`,'content-length': contentLength, ...reqHeaders } = {} } = req;

  const projectId = isLocalhost
    ? firebaseConfig.projectId
    : X_GOOGLE_GCP_PROJECT || firebaseConfig.projectId;
  const cloudResourceLocation = isLocalhost
    ? firebaseConfig.cloudResourceLocation || region
    : X_GOOGLE_FUNCTION_REGION || region;

  const reqUrl = isLocalhost
    ? `http://${host}/${projectId}/${cloudResourceLocation}1`
    : `https://${cloudResourceLocation}-${projectId}.cloudfunctions.net`;

  const { url, headers = {}, ...otherOptions } = options;

  return axios({
    url: `${reqUrl}/${service}/${url}`,
    headers: {
      ...reqHeaders,
      ...headers,
    },
    ...otherOptions,
  });
}

module.exports = ifc;
