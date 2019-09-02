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
const admin = require("firebase-admin");
const { createFunctions } = require("firebase-framework");
const serviceAccount = require("../serviceAccountKey.json");
const services = require("./services");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "<your firebase database url>"
});

const config = {};

module.exports = createFunctions(config, services);
```

#### Creating your first service

1. create a folder inside of `functions` called `hello`
2. create an `index.js` file inside of `functions/hello`
3. add the following to `index.js`

```js
const schema = {
  name: {
    type: "string",
    required: true
  },
  age: {
    type: "number",
    required: true
  }
};

module.exports = {
  basePath: "hello",
  schema,
  routes: [
    {
      path: "/",
      function: req => [200, { message: "hello-world" }]
    }
  ]
};
```

4. create a file inside of `functions/` called `services.js`
5. add the following into into `services.js`

```js
const hello = require("./hello");

module.exports = [hello];
```

## Service Configuration

- Service configuration is exported from the `index.js` file in the service's directory
- the config object's structure is as follows:

| key            | required | type    | description                                                                                                                                |
| -------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| basePath       | true     | string  | defines the services base-path                                                                                                             |
| resourcePath   | false    | string  | defines which documents in the db should be published when changed ex: `'posts/{id}'` (uses the cloud functions firestore triggers syntax) |
| schema         | false    | object  | should contain a reference to the `require`d schema file                                                                                   |
| postSchema     | false    | object  | optional alternative used for services that require special fields during creation                                                         |
| publishChanges | false    | boolean | whether the service should publish changes to it's data as messages on cloud pub sub                                                       |
| withModifiers  | false    | boolean | declares that the schema can contain `writeModifier` keys that define a function that will modify values before they are processes/saved   |
| routes         | false    | Array   | these are the functions triggered within the service by http requests (see routes below)                                                   |
| events         | false    | Array   | pub sub events that the service will listed to (see events below)                                                                          |
| schedule       | false    | Array   | cloud schedules that will trigger functions within this service (see schedule below)                                                       |

#### Routes

| key       | required | type     | description                                                                                       |
| --------- | -------- | -------- | ------------------------------------------------------------------------------------------------- |
| path      | true     | string   | expressJs style paths that can contain parameters                                                 |
| method    | true     | string   | ['get', 'post', 'put', 'delete']                                                                  |
| function  | false    | function | to be executed when a request reaches the defined `path`(optional if privilege defines functions) |
| privilege | false    | string   | one of the privileges defined in validatePrivilege middleware                                     |

#### Events

| key      | required | type     | description                                                                                                                                                                                                                       |
| -------- | -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| topic    | true     | string   | the pub sub topic to subscribe to                                                                                                                                                                                                 |
| type     | false    | string   | the event type to listen to. This is passed to the subscriber but will not affect which message in the topic trigger the subscriber, it can function as a not about which types of events from the topic the function cares about |
| function | false    | function | to be executed when the described event is triggered                                                                                                                                                                              |

#### Schedule

| key      | required | type     | description                                                                     |
| -------- | -------- | -------- | ------------------------------------------------------------------------------- |
| name     | true     | string   | The name of the schedule (it can be anything)                                   |
| time     | true     | string   | Both Unix Crontab and AppEngine syntax are supported by Google Cloud Scheduler. |
| function | false    | function | to be executed when the cronjob is run                                          |

## Service Schemas

- The schema for a service's data is defined in a file named schema.js which sits in the root directory of the service (ex: functions/posts/schema.js)
- A separate schema used when creating records can be defined in a file named postSchema.js which sits in the root directory of the service (ex: functions/posts/postSchema.js) it is used only for `post` requests

A valid schema consists of an array of objects containing keys defined below

| key           | type                            | required | valid values                                         |
| ------------- | ------------------------------- | -------- | ---------------------------------------------------- |
| type          | string                          | true     | 'boolean', 'string', 'object', 'number'              |
| default       | boolean, string, object, number | false    | any                                                  |
| required      | boolean, function               | false    | true, false, (value: any, record: Object) => boolean |
| enum          | Array                           | false    | any[]                                                |
| readOnly      | boolean                         | false    | true, false                                          |
| immutable     | boolean                         | false    | true, false                                          |
| nullable      | boolean                         | false    | true, false                                          |
| validator     | function                        | false    | (value: any, record: Object) => boolean              |
| writeModifier | function                        | false    | (value: any, record: Object) => any                  |

## Schema Validation

A function that will validate schemas is available in `'firebase-framework/validateSchema'`

## Exporting Services

- All service directories should be imported into the `src/services.js` file and exported from it in the `services` array

## CRUD Operations

- within the `index.js` file, `path`s should point to individual functions to handle each operation
- these can be named as follows: (for standard CRUD endpoints)
  - `list.js` returns a list of resources (ex: list of causes)
  - `show.js` returns a single resource (ex: for the cause page)
  - `create.js` creates a new resource and returns the resulting object from firestore
  - `update.js` updates and returns an existing resource

## Deployment

To switch to the default project run `firebase use default`

- To deploy to firebase execute the following commands:

  - `firebase login`
  - `firebase use default`
  - `firebase deploy`

- To test http triggers locally run `firebase serve`
  - some functions require runtime env variables. For local development these are stored in `/src/.runtimeconfig.json`
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
The issue with this is that events that are not inherently idempotent (specifically counter operations) can cause corrupted data.

To solve this, the `ensureIdempotency` value for an event should be set to `true` if duplicate execution of that event could be an issue.
This is especially important if `Retry on failure` is set to true in the google console.

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
This is done by calling `setComplete` within your transaction and passing it a reference to your transaction.

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
