const functions = require('firebase-functions');
const parseRoutes = require('./parseRoutes');
const publishChanges = require('./publishChanges');
const parseMessage = require('./pubSub/parseMessage');
const withIdempotency = require('./ensureIdempotent');
const keepFunctionAlive = require('./keepFunctionAlive');
const configStore = require('./configStore');
const ignoreOldEvents = require('./ignoreOldEvents');

const fromEntries = [(acc, [key, value]) => ({ ...acc, [key]: value }), {}];

const flattenObjects = [(acc, el) => ({ ...acc, ...el }), {}];

const setupRoutes = (config, service) =>
  Array.isArray(service.routes)
    ? {
        [service.basePath]: functions
          .region(config.region)
          .runWith(config.runtimeOptions || service.runtimeOptions || {})
          .https.onRequest(parseRoutes(config, service)),
      }
    : {};

const setupOnCreate = (config, service) =>
  functions.firestore
    .region(config.region)
    .document(service.resourcePath)
    .onCreate(publishChanges(service.basePath));

const setupOnUpdate = (config, service) =>
  functions.firestore
    .region(config.region)
    .document(service.resourcePath)
    .onUpdate(publishChanges(service.basePath));

const setupOnDelete = (config, service) =>
  functions.firestore
    .region(config.region)
    .document(service.resourcePath)
    .onDelete(publishChanges(service.basePath));

const setupDBTriggers = (config, service) =>
  service.publishChanges
    ? {
        [`${service.basePath}_onCreate`]: setupOnCreate(config, service),
        [`${service.basePath}_onUpdate`]: setupOnUpdate(config, service),
        [`${service.basePath}_onDelete`]: setupOnDelete(config, service),
      }
    : {};

const setupKeepAlive = (config, service) =>
  service.keepAlive
    ? {
        [`${service.basePath}_keep_alive`]: functions
          .region(config.region)
          .pubsub.schedule('every 5 minutes')
          .onRun(keepFunctionAlive(service)),
      }
    : {};

const setupSchedule =
  (config, service) =>
  ({
    time,
    name,
    function: toExecute,
    timeZone = 'America/New_York',
    runtimeOptions,
  }) =>
    [
      [`${service.basePath}_${name}`],
      functions
        .region(config.region)
        .runWith(runtimeOptions || service.runtimeOptions || {})
        .pubsub.schedule(time)
        .timeZone(timeZone)
        .onRun(toExecute),
    ];

const setupSchedules = (config, service) =>
  Array.isArray(service.schedule)
    ? service.schedule
        .map(setupSchedule(config, service))
        .reduce(...fromEntries)
    : {};

const setupEvent =
  (config, service) =>
  ({
    topic,
    type = '',
    function: toExecute,
    ensureIdempotent = false,
    maxAge,
    runtimeOptions,
  }) => {
    const functionName = `${service.basePath}_${topic}${
      type ? `_${type}` : ''
    }`;

    const handlerWithIdempotency = ensureIdempotent
      ? withIdempotency(functionName, toExecute)
      : toExecute;

    const handler = Boolean(maxAge)
      ? ignoreOldEvents(maxAge, handlerWithIdempotency)
      : handlerWithIdempotency;

    return [
      functionName,
      functions
        .region(config.region)
        .runWith(runtimeOptions || service.runtimeOptions || {})
        .pubsub.topic(topic)
        .onPublish(parseMessage(handler)),
    ];
  };

const setupEvents = (config, service) =>
  Array.isArray(service.events)
    ? service.events.map(setupEvent(config, service)).reduce(...fromEntries)
    : {};

const parseConfig = (config, service) => ({
  ...setupRoutes(config, service),
  ...setupSchedules(config, service),
  ...setupDBTriggers(config, service),
  ...setupEvents(config, service),
  ...setupKeepAlive(config, service),
});

const createFunctions = (config = {}, services) => {
  configStore.config = { ...configStore.config, ...config };

  return services
    .map((service) => parseConfig(configStore.config, service))
    .reduce(...flattenObjects);
};

module.exports = createFunctions;
