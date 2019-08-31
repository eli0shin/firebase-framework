const { PubSub } = require('@google-cloud/pubsub');

const pubsub = new PubSub();

module.exports = topic => async (change, context) => {
  const { eventType } = context;

  const type = eventType.split('google.firestore.document.').pop();

  let eventData;

  if (type === 'create') {
    eventData = change.data();
  } else if (type === 'update') {
    eventData = change.after.data();
  } else if (type === 'delete') {
    eventData = change.data();
  }

  const data = JSON.stringify({
    type,
    data: eventData,
    ...(type === 'update' ? { dataBefore: change.before.data() } : {}),
    changeContext: context,
  });

  const dataBuffer = Buffer.from(data);

  return pubsub.topic(topic).publish(dataBuffer);
};
