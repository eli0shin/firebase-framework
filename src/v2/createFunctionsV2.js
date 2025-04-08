const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentDeleted, onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore');
const parseRoutes = require('../parseRoutes');
const withIdempotencyV2 = require('../ensureIdempotent');
const keepFunctionAlive = require('../keepFunctionAlive');
const configStore = require('../configStore');
const publishChangesV2 = require('./publishChangesV2');
const parseMessageV2 = require('./pubSub/parseMessageV2');
const ignoreOldEventsV2 = require('./ignoreOldEventsV2');

const fromEntries = [(acc, [key, value]) => ({ ...acc, [key]: value }), {}];

const flattenObjects = [(acc, el) => ({ ...acc, ...el }), {}];

const setupRoutesV2 = (config, service) =>
  Array.isArray(service.routes)
    ? {
        [service.basePath]: onRequest(
          {
            region: config.region,
            ...(config.runtimeOptions || service.runtimeOptions),
          },
          parseRoutes(config, service)
        ),
      }
    : {};

const setupOnCreateV2 = (config, service) =>
  onDocumentCreated(
    {
      region: config.region,
      document: service.resourcePath,
    },
    publishChangesV2(service.basePath)
  );

const setupOnUpdateV2 = (config, service) =>
  onDocumentUpdated(
    {
      region: config.region,
      document: service.resourcePath,
    },
    publishChangesV2(service.basePath)
  );

const setupOnDeleteV2 = (config, service) =>
  onDocumentDeleted(
    {
      region: config.region,
      document: service.resourcePath,
    },
    publishChangesV2(service.basePath)
  );

const setupDBTriggersV2 = (config, service) =>
  service.publishChanges
    ? {
        [`${service.basePath}_onCreate`]: setupOnCreateV2(config, service),
        [`${service.basePath}_onUpdate`]: setupOnUpdateV2(config, service),
        [`${service.basePath}_onDelete`]: setupOnDeleteV2(config, service),
      }
    : {};

const setupKeepAliveV2 = (config, service) =>
  service.keepAlive
    ? {
        [`${service.basePath}_keep_alive`]: onSchedule(
          {region: config.region, schedule: "every 5 minutes"},
          keepFunctionAlive(service)
        ),
      }
    : {};

const setupScheduleV2 =
  (config, service) =>
  ({
    time,
    name,
    function: toExecute,
    timeZone = "America/New_York",
    runtimeOptions,
  }) =>
    [
      [`${service.basePath}_${name}`],
      onSchedule(
        {
          schedule: time,
          region: config.region,
          timeZone,
          ...(runtimeOptions || service.runtimeOptions),
        },
        toExecute
      ),
    ];

const setupSchedulesV2 = (config, service) =>
  Array.isArray(service.schedule)
    ? service.schedule
        .map(setupScheduleV2(config, service))
        .reduce(...fromEntries)
    : {};

const setupEventV2 =
  (config, service) =>
  ({
    topic,
    type = "",
    function: toExecute,
    ensureIdempotent = false,
    maxAge,
    runtimeOptions,
  }) => {
    const functionName = `${service.basePath}_${topic}${
      type ? `_${type}` : ""
    }`;

    const handlerWithIdempotency = ensureIdempotent
      ? withIdempotencyV2(functionName, toExecute)
      : toExecute;

    const handler = maxAge
      ? ignoreOldEventsV2(maxAge, handlerWithIdempotency)
      : handlerWithIdempotency;

    return [
      functionName,
      onMessagePublished(
        {
          topic,
          region: config.region,
          ...(runtimeOptions || service.runtimeOptions),
        },
        parseMessageV2(handler)
      ),
    ];
  };

const setupEventsV2 = (config, service) =>
  Array.isArray(service.events)
    ? service.events.map(setupEventV2(config, service)).reduce(...fromEntries)
    : {};

const parseConfigV2 = (config, service) => ({
  ...setupRoutesV2(config, service),
  ...setupSchedulesV2(config, service),
  ...setupDBTriggersV2(config, service),
  ...setupEventsV2(config, service),
  ...setupKeepAliveV2(config, service),
});

const createFunctionsV2 = (config = {}, services) => {
  configStore.config = { ...configStore.config, ...config };

  return services
    .map((service) => parseConfigV2(configStore.config, service))
    .reduce(...flattenObjects);
};

module.exports = createFunctionsV2;
