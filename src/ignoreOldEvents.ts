/**
 * If an event continues to retry for a long period of time
 * there may be a reason to just drop it and stop retrying
 * This util, when applied, will bail out of a handler if
 * it is greater than the maxAge set.
 */

import { EventContext } from 'firebase-functions';
import { Message } from './types/Service';

export function setupIgnoreOldEvents<T extends (message: Message, context: EventContext) => any>(maxAge: number | undefined, handler: T) {
  return function ignoreOldEvents(...args: Parameters<T>): ReturnType<T> | boolean {
    const [message, context] = args;
    const eventAgeMs = Date.now() - Date.parse(context.timestamp);

    if (maxAge && eventAgeMs > maxAge) {
      console.log(
        `Dropping event ${context.eventId} with age[ms]: ${eventAgeMs}`
      );
      return true;
    }

    return handler(message, context);
  };
}
