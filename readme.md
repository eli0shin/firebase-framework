# Firebase Framework

## Getting Started

To begin you will need `nodejs` and `firebase-tools`

nodejs v8.15.x is recommended because cloud functions by default uses node 8. \
While it is not the most recent LTS build it can be downloaded here:
<https://nodejs.org/download/release/v8.15.1/>

To install `firebase-tools` run

```bash
npm i -G firebase-tools
```

Go to [https://console.firebase.google.com]() and create a new Firebase project

```bash
mkdir firebase-project
cd firebase-project
firebase init
```

Select Firestore, Cloud Functions and the firebase project that you created, the rest is up to you.

You will need a serviceAccountKey.json field in the root of the project directory to run the functions locally.
(This can be obtained from the Firebase console under project users and permissions.)

```bash
cd functions
npm install --save firebase-framework
```

Your `functions/index.js` file should contain:

```js
const admin = require('firebase-admin');
const { createFunctions } = require('firebase-framework');
const serviceAccount = require('../serviceAccountKey.json');
const services = require('./services');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: '<your firebase database url>',
});

const config = {};

module.exports = createFunctions(config, services);
```

##### Config

The config object can contain the following values:

| key               | required | default                                                                                            | type       | description                                                                                                                                               |
| ----------------- | -------- | -------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| region            | false    | us-central1                                                                                        | string     | GCP region in which to deploy functions. Valid values are listed here: https://firebase.google.com/docs/functions/locations                               |
| validatePrivilege | false    | (privilege) => (req, res, next) => next()                                                          | Function   | A function that accepts a privilege and returns an expressJs middleware function to validate whether the client has the correct privilege for the request |
| middleware        | false    | []                                                                                                 | Function[] | An array of expressJs middleware to be added to all routes across all services                                                                            |
| corsEnabled       | false    | true                                                                                               | boolean    | whether the expressJs cors middleware should be enabled https://www.npmjs.com/package/cors                                                                |
| corsOptions       | false    | {origin: true,methods: "GET,PUT,POST,DELETE,OPTIONS", allowedHeaders: "token, role, content-type"} | Object     | expressJs cors middleware options https://www.npmjs.com/package/cors#configuring-cors                                                                     |

#### Creating your first service

1. create a folder inside of `functions` called `hello`
2. create an `index.js` file inside of `functions/hello`
3. add the following to `index.js`

```js
const schema = {
  name: {
    type: 'string',
    required: true,
  },
  age: {
    type: 'number',
    required: true,
  },
};

module.exports = {
  basePath: 'hello',
  schema,
  routes: [
    {
      path: '/',
      function: req => [200, { message: 'hello-world' }],
    },
  ],
};
```

4. create a file inside of `functions/` called `services.js`
5. add the following into into `services.js`

```js
const hello = require('./hello');

module.exports = [hello];
```

## Service Configuration

- Service configuration is exported from the `index.js` file in the service's directory
- the config object's structure is as follows:

| key            | required | type    | description                                                                                                                                                                                                                                                |
| -------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| basePath       | true     | string  | defines the services base-path                                                                                                                                                                                                                             |
| resourcePath   | false    | string  | defines which documents in the db should be published when changed ex: `'posts/{id}'` (uses the cloud functions firestore triggers syntax)                                                                                                                 |
| schema         | false    | object  | should contain a reference to the `require`d schema file                                                                                                                                                                                                   |
| postSchema     | false    | object  | optional alternative used for services that require special fields during creation                                                                                                                                                                         |
| publishChanges | false    | boolean | whether the service should publish changes to it's data as messages on cloud pub sub                                                                                                                                                                       |
| withModifiers  | false    | boolean | declares that the schema can contain `writeModifier` keys that define a function that will modify values before they are processes/saved                                                                                                                   |
| middleware     | false    | Array   | ExpressJs middleware that will apply to all routes in the service                                                                                                                                                                                          |
| routes         | false    | Array   | these are the functions triggered within the service by http requests (see routes below)                                                                                                                                                                   |
| events         | false    | Array   | pub sub events that the service will listed to (see events below)                                                                                                                                                                                          |
| schedule       | false    | Array   | cloud schedules that will trigger functions within this service (see schedule below)                                                                                                                                                                       |
| keepAlive      | false    | boolean | whether a scheduled function should be set up that will trigger the http function (routes) every 5 minutes to prevent cold starts\*                                                                                                                        |
| runtimeOptions | false    | object  | An object containing 2 optional properties. `memory`: amount of memory to allocate to the function, possible values are: '128MB', '256MB', '512MB', '1GB', and '2GB'. `timeoutSeconds`: timeout for the function in seconds, possible values are 0 to 540. |

\* Though billing is required, you can expect the overall cost to be manageable, as each Cloud Scheduler job costs \$0.10 (USD) per month, and there is an allowance of three free jobs per Google account (as of the time of writing). \* The keepAlive feature adds a route to the service at '/heartbeat'. This will not conflict with wildcard routes in the service but would conflict with a route named the same.

#### Routes

| key        | required | type              | description                                                                                                |
| ---------- | -------- | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| path       | true     | string            | expressJs style paths that can contain parameters                                                          |
| method     | true     | string            | ['get', 'post', 'put', 'delete']                                                                           |
| function   | false    | function          | to be executed when a request reaches the defined `path`(optional if privilege defines functions)          |
| privilege  | false    | string            | one of the privileges defined in validatePrivilege middleware                                              |
| ignoreBody | false    | boolean           | if set to true the body of POST / PUT requests to the route will not be checked against the service schema |
| middleware | false    | Array<Middleware> | an array of middleware that will apply to this route                                                       |

#### Events

| key              | required | type     | description                                                                                                                                                                                                                                                |
| ---------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| topic            | true     | string   | the pub sub topic to subscribe to                                                                                                                                                                                                                          |
| type             | false    | string   | the event type to listen to. This is passed to the subscriber but will not affect which message in the topic trigger the subscriber, it can function as a not about which types of events from the topic the function cares about                          |
| function         | false    | function | to be executed when the described event is triggered                                                                                                                                                                                                       |
| ensureIdempotent | false    | boolean  | whether the framework should check messages against a store (requires a firestore database in the project) to ensure that messages are never processed more than once                                                                                      |
| runtimeOptions   | false    | object   | An object containing 2 optional properties. `memory`: amount of memory to allocate to the function, possible values are: '128MB', '256MB', '512MB', '1GB', and '2GB'. `timeoutSeconds`: timeout for the function in seconds, possible values are 0 to 540. |

#### Schedule

| key            | required | type     | description                                                                                                                                                                                                                                                |
| -------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name           | true     | string   | The name of the schedule (it can be anything)                                                                                                                                                                                                              |
| time           | true     | string   | Both Unix Crontab and AppEngine syntax are supported by Google Cloud Scheduler.                                                                                                                                                                            |
| function       | false    | function | to be executed when the cronjob is run                                                                                                                                                                                                                     |
| runtimeOptions | false    | object   | An object containing 2 optional properties. `memory`: amount of memory to allocate to the function, possible values are: '128MB', '256MB', '512MB', '1GB', and '2GB'. `timeoutSeconds`: timeout for the function in seconds, possible values are 0 to 540. |

## Service Schemas

- The schema for a service's data is defined in a file named schema.js which sits in the root directory of the service (ex: functions/posts/schema.js)
- A separate schema used when creating records can be defined in a file named postSchema.js which sits in the root directory of the service (ex: functions/posts/postSchema.js) it is used only for `post` requests

A valid schema consists of an array of objects containing keys defined below

| key           | type                                      | required | valid values                                                       |
| ------------- | ----------------------------------------- | -------- | ------------------------------------------------------------------ |
| type          | string                                    | true     | 'boolean', 'string', 'object', 'number'                            |
| default       | boolean, string, object, number, function | false    | any, (record: Object, req: Request) => any / Promise<any>          |
| required      | boolean, function                         | false    | true, false, (value: any, record: Object, req: Request) => boolean |
| enum          | Array                                     | false    | any[]                                                              |
| readOnly      | boolean                                   | false    | true, false                                                        |
| immutable     | boolean                                   | false    | true, false                                                        |
| nullable      | boolean                                   | false    | true, false                                                        |
| validator     | function                                  | false    | (value: any, record: Object, req: Request) => boolean              |
| writeModifier | function                                  | false    | (value: any, record: Object, req: Request) => any                  |

## Schema Validation

A function that will validate schemas is available. It can be used as follows;

```js
const { validateSchema } = require('firebase-framework');
const services = require('./services');

services.forEach(validateSchema);
```

## Route Handlers

HTTP functions must have the following signature:

```js
(req, req) => [statusCode, body, headers?] | Promise<[statusCode, body, headers?]> | void
```

The `req` and `res` arguments are regular express.js `request` and `response` objects.
the key distinction being that while you _can_ call `res.status(200).send{hello: 'world}` to send a response, have found it preferable to return a tuple of [statusCode, responseBody, responseHeaders] from the route handler function.

## Event Handlers

Event Handlers have the following signature:

```js
(message, context) => Promise<void> | void
```

Message:

| key           | description                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------- |
| data          | data transmitted with the message (already parsed JSON)                                         |
| dataBefore    | only on db change triggers set off by an update operation, describes the data before the change |
| changeContext | context of a db change event message (db changes are proxied over Google PubSub )               |
| type          | type of db change the occurred, ['create', 'update', 'delete']                                  |

## Deployment

To switch to the default project run `firebase use default`

- To deploy to firebase execute the following commands:

  - `firebase login`
  - `firebase use default`
  - `firebase deploy`

- To test http triggers locally run `firebase serve`
  - some functions require runtime env variables. For local development these can be stored in `/functions/.runtimeconfig.json`
  - This file is should not be committed to version control as it may contain secrets. To auto-generate it with the current project env:
    - `cd` into `src`
    - on macOS or linux run `firebase functions:config:get > .runtimeconfig.json`
    - on windows, in powershell run `firebase functions:config:get | ac .runtimeconfig.json`

## Data Relationships

Being that the DB used is Firestore and it is a NoSQL (non-relational) database, we compile related data after writes as opposed to during reads. This helps improve read performance due to the ability to return a data structure as it exists at rest.

- when a resource is updated it should emit an event on cloud pub sub describing the update that occurred, and the resource it affected.
- services can listen to these events and update their data accordingly
- fields updated in this way should be marked as `readOnly | immutable` in their schema to prevent CRUD operations on that resource from causing them to get out of sync
- an example of this would be the a counter:
  - when an action occurred that should increment that counter the service will dispatch an event describing the update
  - the counter service can listen to that event and, within a transaction, update the counter

## Event Idempotency

Google PubSub ensures at-least-once delivery. What this means for us is that while all events are ensured to be delivered, if a function times out or takes too long to come up, the event will be delivered again.
The issue with this is that events that are not inherently idempotent (specifically counter operations) can cause corrupted data when run more than once.

To solve this, the `ensureIdempotency` value for an event should be set to `true` if duplicate execution of that event could be an issue.
This is especially important if `Retry on failure` is set to true in the google cloud console.

Setting this flag to `true` requires that you accept a different first argument to your event handler function.
instead of

```js

function (message, context) {
}
```

It should be:

```js
async function (setComplete, message, context){
  // do your thing
  await setComplete();
}
```

In the case of a counter where a transaction or batch is used to update a value,
the idempotent success confirmation callback should be run inside of the transaction.
This is done by calling `setComplete` within your transaction and passing it a reference to your transaction or passing it the batch reference.

```js
async function (setComplete, message, context){
  await db.runTransaction(async t => {
    // do your thing
    await setComplete(t);
  })
}
```

## Inter-Service Communication

Services are highly siloed from each other. They cannot call functions in each other, access object, and they should not access each others db storage.

To request data from a service the `iFC` inter-function communicator can be used.

It is simply a http client wrapped in a function that will automatically find and make a call to a service given standard http parameters.

Additional documentation can be found in `iFC.js`

## Custom domains

Firebase supports custom domains for functions via firebase hosting. The official firebase docs are available here: <https://firebase.google.com/docs/hosting/functions>.
There is a bug (maybe?) in the firebase runtime that effects functions using a custom domain.
This framework uses an express router under the hood for all http functions. When a request comes in through the default firebase url to the `/` path of a service with a `basePath` of `users` the request path is `/`. This matches the configured route. When the same function is reached via a firebase hosting rule that directs `<your-domain>/users` to the `users` function the request path is `/users`.
We cannot check the domain of the request because the request domain is the same whether the requests originates from a custom domain or the default one. In order to provide support for both use-cases we have to mount the service's express.js router to 2 paths: `/` and `/<service-basePath>`, in this case `/` and `/users`.
For many projects this will present no issue but in the case of a route that looks like this `/users/users` the behavior may be unpredictable.
Hopefully in the future this issue will be fixed in the firebase runtime by the firebase team. Until then we must live with the constraints that this provides.
