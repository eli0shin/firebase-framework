import {iFC} from './iFC';
import { ServiceConfiguration } from './types/Service';

export function keepFunctionAlive(service: ServiceConfiguration) {
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
