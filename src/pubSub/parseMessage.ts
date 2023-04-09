import { EventContext, pubsub } from 'firebase-functions';

export function parseMessage(
  callback: (message: any, context: EventContext) => any
) {
  return function handleMessage(data: pubsub.Message, context: EventContext) {
    const message = data.data
      ? Buffer.from(data.data, 'base64').toString()
      : null;

    if (!message) {
      throw new Error('message cannot be empty');
    }

    const parsedMessage = JSON.parse(message);

    return callback(parsedMessage, context);
  };
}
