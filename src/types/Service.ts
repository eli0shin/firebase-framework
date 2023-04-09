import { PubSub } from '@google-cloud/pubsub';
import { Middleware } from './Config';
import { EventContext, RuntimeOptions } from 'firebase-functions';
import { ScheduleBuilder } from 'firebase-functions/lib/providers/pubsub';
import { UnwrapResponse } from '../visibility';
import { Request } from './Request';
import { Response } from 'express';

// Service Configuration
export type ServiceConfiguration = {
  /** defines the services base-path */
  basePath: string;
  /** defines which documents in the db should be published when changed ex: 'posts/{id}' (uses the cloud functions firestore triggers syntax) */
  resourcePath?: string;
  /** should contain a reference to the imported schema file */
  schema?: Schema;
  /** optional alternative used for services that require special fields during creation */
  postSchema?: Schema;
  /** whether the service should publish changes to it's data as messages on cloud pub sub */
  publishChanges?: boolean;
  /** declares that the schema can contain `writeModifier` keys that define a function that will modify values before they are processes/saved */
  withModifiers?: boolean;
  /** ExpressJs middleware that will apply to all routes in the service */
  middleware?: Middleware[];
  /** these are the functions triggered within the service by http requests (see routes below) */
  routes?: Route[];
  /** pub sub events that the service will listen to (see events below) */
  events?: Event[];
  /** cloud schedules that will trigger functions within this service (see schedule below) */
  schedule?: Schedule[];
  /** whether a scheduled function should be set up that will trigger the http function (routes) every 5 minutes to prevent cold starts */
  keepAlive?: boolean;
  /** Firebase runtime options usually passed to `runWith` as documented here: https://firebase.google.com/docs/reference/functions/function_configuration.runtimeoptions */
  runtimeOptions?: RuntimeOptions;
  /** The maxAge in ms before the event listener will not attempt to process an event. Can be used to prevent infinite retries of a retry-able event */
  maxAge?: number;
};

// Routes
export type Route = {
  /** expressJs style paths that can contain parameters */
  path: string;
  /** ['get', 'post', 'put', 'delete'] */
  method: string;
  /** to be executed when a request reaches the defined `path`(optional if privilege defines functions) */
  function: RouteHandler;
  /** one of the privileges defined in validatePrivilege middleware */
  privilege?: string;
  /** if set to true the body of POST / PUT requests to the route will not be checked against the service schema */
  ignoreBody?: boolean;
  /** an array of middleware that will apply to this route */
  middleware?: Middleware[];
  unwrapResponse?: UnwrapResponse;
  schema?: Schema;
  visibility?: string;
};

// Events
export type Event = {
  /** the pub sub topic to subscribe to */
  topic: string;
  /** the event type to listen to. This is passed to the subscriber but will not affect which message in the topic trigger the subscriber, it can function as a note about which types of events from the topic the function cares about */
  type?: string;
  /** to be executed when the described event is triggered */
  function: EventHandler;
  /** whether the framework should check messages against a store (requires a firestore database in the project) to ensure that messages are never processed more than once */
  ensureIdempotent?: false;
  /** Firebase runtime options usually passed to `runWith` as documented here: https://firebase.google.com/docs/reference/functions/function_configuration.runtimeoptions */
  runtimeOptions?: RuntimeOptions;
  maxAge?: number;
} | {
  /** the pub sub topic to subscribe to */
  topic: string;
  /** the event type to listen to. This is passed to the subscriber but will not affect which message in the topic trigger the subscriber, it can function as a note about which types of events from the topic the function cares about */
  type?: string;
  /** to be executed when the described event is triggered */
  function: IdempotentEventHandler;
  /** whether the framework should check messages against a store (requires a firestore database in the project) to ensure that messages are never processed more than once */
  ensureIdempotent: true;
  /** Firebase runtime options usually passed to `runWith` as documented here: https://firebase.google.com/docs/reference/functions/function_configuration.runtimeoptions */
  runtimeOptions?: RuntimeOptions;
  maxAge?: number;
};

// Schedule
export type Schedule = {
  /** The name of the schedule (it can be anything) */
  name: string;
  /** Both Unix Crontab and AppEngine syntax are supported by Google Cloud Scheduler. */
  time: string;
  timeZone?: string;
  /** to be executed when the cronjob is run */
  function: Parameters<ScheduleBuilder['onRun']>[0];
  /** Firebase runtime options usually passed to `runWith` as documented here: https://firebase.google.com/docs/reference/functions/function_configuration.runtimeoptions */
  runtimeOptions?: RuntimeOptions;
};

// Service Schemas
export type SchemaField = {
  /** 'boolean', 'string', 'object', 'number' */
  type: 'boolean' | 'string' | 'object' | 'number';
  /** any, (record: Object, req: Request) => any / Promise<any> */
  default?:
    | boolean
    | string
    | object
    | number
    | ((...args: any[]) => any | Promise<any>);
  /** boolean value or function that returns boolean to describe whether the value is required */
  required?:
    | boolean
    | (<T extends Record<string, unknown>>(
        record: T,
        req: Request
      ) => boolean);
  enum?: string[];
  readOnly?: boolean;
  /** true, false */
  immutable?: boolean;
  /** true, false */
  nullable?: boolean;
  /** (value: any, record: Object, req: Request) => boolean */
  validator?: (value: any, record: Object, req: Request) => boolean;
  /** (value: any, record: Object, req: Request) => any **/
  writeModifier?: (value: any, record: Object, req: Request) => any;
};

export type Schema = Record<string, SchemaField>;
// Route Handlers
export type RouteHandler = (
  req: Request,
  res: Response
) => [number, any, any?] | Promise<[number, any, any?]> | void;

// Event Handlers
export type EventHandler = (
  message: Message,
  context: EventContext
) => Promise<void>;

export type IdempotentEventHandler = (
  transaction: (t: FirebaseFirestore.Transaction) => Promise<void>,
  message: Message,
  context: EventContext
) => Promise<void>;

// Message
export type Message<T = Record<string, unknown>> = {
  /** data transmitted with the message (already parsed JSON) */
  data: T;
  /** only on db change triggers set off by an update operation, describes the data before the change */
  dataBefore?: T;
  /** context of a db change event message (db changes are proxied over Google PubSub ) */
  changeContext?: PubSub;
  /** type of db change the occurred, ['create', 'update', 'delete'] **/
  type: 'create' | 'update' | 'delete';
};

// Context
export type Context = {
  // Add any relevant properties from the context object
};
