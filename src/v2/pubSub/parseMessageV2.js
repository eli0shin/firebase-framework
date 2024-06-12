const parseMessageV2 = callback => (event) => {
  const { data } = event.json;
  const {message} = data;

  const newMessage = message.data
    ? Buffer.from(message.data, 'base64').toString()
    : null;

  if (!newMessage) {
    throw new Error('message cannot be empty');
  }

  const parsedMessage = JSON.parse(newMessage);

  return callback(parsedMessage, event);
};

module.exports = parseMessageV2;
