const { PubSub } = require('@google-cloud/pubsub');

function publish(topic, type, message) {
  const pubsub = new PubSub();

  const data = JSON.stringify({
    data: message,
    type,
  });

  const dataBuffer = Buffer.from(data);

  return pubsub.topic(topic).publish(dataBuffer);
}

module.exports = publish;
