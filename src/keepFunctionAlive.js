const iFC = require('./iFC');

function keepFunctionAlive(service) {
  const { basePath } = service;
  return async function pingKeepAliveFunction() {
    try {
      const result = await iFC(basePath, { url: 'heartbeat' });
      console.log(`TCL: pingKeepAliveFunction -> result`, result);
    } catch (error) {
      console.error(error);
      throw error;
    }
  };
}

module.exports = keepFunctionAlive;
