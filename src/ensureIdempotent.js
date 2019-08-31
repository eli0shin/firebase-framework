const firebase = require("firebase-admin");

/**
 * This function ensures that a processed event is only processed once.
 * It should be used when an action is not inherently idempotent.
 * ex: updating a counter when done twice will yield an incorrect result
 *
 * It can be passed a transaction or batch reference to include it's write within the action that it is there to protect
 *
 * The function is called with the event callback as the only argument
 *
 * It returns a callable event trigger that is wrapped in the idempotency checking functionality
 *
 * It adds an argument before the normal pubsub subscriber arguments that is called with the transaction reference
 * at the end of a db transaction saving the `completed` flag along with a `timestamp` (to delete old values)
 *
 * It can also be called without passing a transaction reference if the operation is done outside of a transaction
 *
 * Your event function should look like this
 * Example:
 *
 * ```js
 * function(setCompleted, message, context) {
 *   await db.runTransaction(async t => {
 *     const currentRef = await t.get(causeRef);
 *
 *     await t.update(causeRef, {
 *       someData,
 *     });
 *
 *     await setCompleted(t);
 *   });
 * }
 * ```
 */

module.exports = idempotencyRef => (functionName, handler) => async (
  ...args
) => {
  const [message, context] = args;

  // if the event is a pubsub message published in response to a db change (it is a relayed message)
  // we need the db change context which is located at `message.context`
  const changeContext = message.changeContext || context;

  const { eventId } = changeContext;

  const idempotencyRef = firebase
    .firestore()
    .doc(`idempotency/${functionName}-${eventId}`);

  const eventDidRun = await idempotencyRef.get();

  // check if this event has already been processed
  if (!eventDidRun.exists || !eventDidRun.data().completed) {
    // if it hasn't, call the handler and pass in the callback
    // that marks that it has been completed
    const callback = async t => {
      if (t) {
        await t.set(idempotencyRef, {
          completed: true,
          timestamp: Number(new Date())
        });
      } else {
        await idempotencyRef.set({
          completed: true,
          timestamp: Number(new Date())
        });
      }
    };

    return handler(callback, ...args);
  }

  console.log(
    `Prevented message: ${eventId} from being processed more than once.`
  );

  return true;
};
