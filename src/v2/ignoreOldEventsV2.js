/**
 * If an event continues to retry for a long period of time
 * there may be a reason to just drop it and stop retrying
 * This util, when applied, will bail out of a handler if
 * it is greater than the maxAge set.
 */

function setupIgnoreOldEvents(maxAge, handler) {
  return function ignoreOldEvents(...args) {
    const [message, context] = args;
    const {time} = message
    const eventAgeMs = Date.now() - Date.parse(time);

    if (eventAgeMs > maxAge) {
      console.log(
        `Dropping event ${context.eventId} with age[ms]: ${eventAgeMs}`
      );
      return true;
    }

    return handler(...args);
  };
}

module.exports = setupIgnoreOldEvents;
