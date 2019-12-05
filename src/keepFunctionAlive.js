const iFC = require('./iFC');

function keepFunctionAlive(service) {
  const { basePath } = service;
  return function pingKeepAliveFunction() {
    return iFC(basePath, { url: 'heartbeat' });
  };
}

module.exports = keepFunctionAlive;
