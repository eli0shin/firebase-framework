const { PubSub } = require('@google-cloud/pubsub');

const pubsub = new PubSub();

module.exports = topic => async (event) => {
  const { type, data } = event;
  const childType = type.split('google.firebase.database.').pop();

  let eventData;

  if (childType === 'ref.v1.created') {
    eventData = data.data();
  } else if (childType === 'ref.v1.updated') {
    eventData = data.after.data();
  } else if (childType === 'ref.v1.deleted') {
    eventData = data.data();
  }

  const newData = JSON.stringify({
    type: childType,
    data: eventData,
    ...(type === 'ref.v1.updated' ? { dataBefore: data.before.data() } : {}),
    changeContext: event,
  });

  const dataBuffer = Buffer.from(newData);

  return pubsub.topic(topic).publish(dataBuffer);
};
