import functions from 'firebase-functions';
import parseRoutes from './parseRoutes';
import publishChanges from './publishChanges';
import { parseMessage } from './pubSub/parseMessage';
import {withIdempotency} from './ensureIdempotent';
import {keepFunctionAlive} from './keepFunctionAlive';
import * as configStore from './configStore';
import {setupIgnoreOldEvents} from './ignoreOldEvents';
import { Event, EventHandler, IdempotentEventHandler, Schedule, ServiceConfiguration } from './types/Service';
import { Config } from './types/Config';
import { Message } from 'firebase-functions/lib/providers/pubsub';

function setupRoutes(config: Config, service: ServiceConfiguration) {
  if (!Array.isArray(service.routes)) {
    return {};
  }
  return {
    [service.basePath]: functions
      .region(config.region)
      .runWith(config.runtimeOptions || service.runtimeOptions || {})
      .https.onRequest(parseRoutes(config, service)),
  };
}

function setupOnCreate(config: Config, service: ServiceConfiguration) {
  if (!service.resourcePath) {
    return {};
  }
  return functions
    .region(config.region)
    .firestore.document(service.resourcePath)
    .onCreate(publishChanges(service.basePath));
}

function setupOnUpdate(config: Config, service: ServiceConfiguration) {
  if (!service.resourcePath) {
    return {};
  }
  return functions
    .region(config.region)
    .firestore.document(service.resourcePath)
    .onUpdate(publishChanges(service.basePath));
}

function setupOnDelete(config: Config, service: ServiceConfiguration) {
  if (!service.resourcePath) {
    return {};
  }
  return functions
    .region(config.region)
    .firestore.document(service.resourcePath)
    .onDelete(publishChanges(service.basePath));
}

function setupDBTriggers(config: Config, service: ServiceConfiguration) {
  if (!service.publishChanges) {
    return {};
  }
  return {
    [`${service.basePath}_onCreate`]: setupOnCreate(config, service),
    [`${service.basePath}_onUpdate`]: setupOnUpdate(config, service),
    [`${service.basePath}_onDelete`]: setupOnDelete(config, service),
  };
}

function setupKeepAlive(config: Config, service: ServiceConfiguration) {
  if (!service.keepAlive) {
    return {};
  }
  return {
    [`${service.basePath}_keep_alive`]: functions
      .region(config.region)
      .pubsub.schedule('every 5 minutes')
      .onRun(keepFunctionAlive(service)),
  };
}

function setupSchedule(config: Config, service: ServiceConfiguration) {
  return function createSchedule({
    time,
    name,
    function: toExecute,
    timeZone = 'America/New_York',
    runtimeOptions,
  }: Schedule) {
    return [
      `${service.basePath}_${name}`,
      functions
        .region(config.region)
        .runWith(runtimeOptions || service.runtimeOptions || {})
        .pubsub.schedule(time)
        .timeZone(timeZone)
        .onRun(toExecute),
    ] as const;
  };
}

function setupSchedules(config: Config, service: ServiceConfiguration) {
  if (!Array.isArray(service.schedule)) {
    return {};
  }

  const scheduleEntries = service.schedule.map(setupSchedule(config, service));
  return scheduleEntries.reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, functions.CloudFunction<unknown>>);
}

function setupEvent(config: Config, service: ServiceConfiguration) {
  return function handleEvent<EventConfig extends Event>({
    topic,
    type = '',
    function: toExecute,
    ensureIdempotent = false,
    maxAge,
    runtimeOptions,
  }: EventConfig) {
    const functionName = `${service.basePath}_${topic}${
      type ? `_${type}` : ''
    }`;

    const handlerWithIdempotency = ensureIdempotent
      ? withIdempotency(functionName, toExecute as IdempotentEventHandler)
      : toExecute as EventHandler;

    const handler = Boolean(maxAge)
      ? setupIgnoreOldEvents(maxAge, handlerWithIdempotency)
      : handlerWithIdempotency;

    return [
      functionName,
      functions
        .region(config.region)
        .runWith(runtimeOptions || service.runtimeOptions || {})
        .pubsub.topic(topic)
        .onPublish(parseMessage(handler)),
    ] as const;
  };
}

function setupEvents(config: Config, service: ServiceConfiguration) {
  if (!Array.isArray(service.events)) {
    return {};
  }
  const eventEntries = service.events.map(setupEvent(config, service));
  return eventEntries.reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, functions.CloudFunction<Message>>);
}

const parseConfig = (config: Config, service: ServiceConfiguration) => ({
  ...setupRoutes(config, service),
  ...setupSchedules(config, service),
  ...setupDBTriggers(config, service),
  ...setupEvents(config, service),
  ...setupKeepAlive(config, service),
});

export function createFunctions(
  config: Config,
  services: ServiceConfiguration[]
) {
  configStore.setConfig(config);

  return services
    .map((service) => parseConfig(configStore.config, service))
    .reduce((acc, el) => ({ ...acc, ...el }), {});
}
