const axios = require("axios");

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

async function ifc(service, options, req = {}) {
  const { X_GOOGLE_GCP_PROJECT, X_GOOGLE_FUNCTION_REGION } = process.env;

  const isLocalhost =
    !X_GOOGLE_FUNCTION_REGION || process.env.environment !== "production";

  const port = process.env.PORT || 5000;

  const { headers: { host = `localhost:${port}`, ...reqHeaders = {} } = {} } = req;

  const projectId = isLocalhost
    ? JSON.parse(process.env.FIREBASE_CONFIG).projectId
    : null;
  const cloudResourceLocation = isLocalhost
    ? JSON.parse(process.env.FIREBASE_CONFIG).cloudResourceLocation
    : null;

  const reqUrl = isLocalhost
    ? `http://${host}/${projectId}/${cloudResourceLocation}1`
    : `https://${X_GOOGLE_FUNCTION_REGION}-${X_GOOGLE_GCP_PROJECT}.cloudfunctions.net`;

  const { url, headers = {}, ...otherOptions } = options;

  return axios({
    url: `${reqUrl}/${service}/${url}`,
    headers: {
      ...reqHeaders,
      ...headers
    },
    ...otherOptions
  });
}

module.exports = ifc;
