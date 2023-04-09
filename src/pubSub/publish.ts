const { PubSub } = require('@google-cloud/pubsub');

export function publish(
  topic: string,
  type: string,
  message: Record<string, unknown>
) {
  const pubsub = new PubSub();

  const data = JSON.stringify({
    data: message,
    type,
  });

  const dataBuffer = Buffer.from(data);

  return pubsub.topic(topic).publish(dataBuffer);
}
