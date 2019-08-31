const functions = require("firebase-functions");
const parseRoutes = require("./parseRoutes");
const publishChanges = require("./publishChanges");
const parseMessage = require("./pubSub/parseMessage");
const withIdempotency = require("./ensureIdempotent");

const fromEntries = [(acc, [key, value]) => ({ ...acc, [key]: value }), {}];

const flattenObjects = [(acc, el) => ({ ...acc, ...el }), {}];

const setupRoutes = (config, service) =>
  Array.isArray(service.routes)
    ? {
        [service.basePath]: functions.https.onRequest(
          parseRoutes(config, service)
        )
      }
    : {};

const setupOnCreate = service =>
  functions.firestore
    .document(service.resourcePath)
    .onCreate(publishChanges(service.basePath));

const setupOnUpdate = service =>
  functions.firestore
    .document(service.resourcePath)
    .onUpdate(publishChanges(service.basePath));

const setupOnDelete = service =>
  functions.firestore
    .document(service.resourcePath)
    .onDelete(publishChanges(service.basePath));

const setupDBTriggers = service =>
  service.publishChanges
    ? {
        [`${service.basePath}_onCreate`]: setupOnCreate(service),
        [`${service.basePath}_onUpdate`]: setupOnUpdate(service),
        [`${service.basePath}_onDelete`]: setupOnDelete(service)
      }
    : {};

const setupSchedule = service => ({ time, name, function: toExecute }) => [
  [`${service.basePath}_${name}`],
  functions.pubsub
    .schedule(time)
    .timeZone("America/New_York")
    .onRun(toExecute)
];

const setupSchedules = service =>
  Array.isArray(service.schedule)
    ? service.schedule.map(setupSchedule(service)).reduce(...fromEntries)
    : {};

const setupEvent = service => ({
  topic,
  type,
  function: toExecute,
  ensureIdempotent = false
}) => [
  `${service.basePath}_${topic}_${type}`,
  functions.pubsub
    .topic(topic)
    .onPublish(
      parseMessage(
        ensureIdempotent
          ? withIdempotency(`${service.basePath}_${topic}_${type}`, toExecute)
          : toExecute
      )
    )
];

const setupEvents = service =>
  Array.isArray(service.events)
    ? service.events.map(setupEvent(service)).reduce(...fromEntries)
    : {};

const parseConfig = (config, service) => ({
  ...setupRoutes(config, service),
  ...setupSchedules(service),
  ...setupDBTriggers(service),
  ...setupEvents(service)
});

const createFunctions = (config, services) =>
  services
    .map(service => parseConfig(config, service))
    .reduce(...flattenObjects);

module.exports = createFunctions;
