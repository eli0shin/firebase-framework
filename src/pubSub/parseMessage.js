const parseMessage = callback => (data, context) => {
  const message = data.data
    ? Buffer.from(data.data, 'base64').toString()
    : null;

  if (!message) {
    throw new Error('message cannot be empty');
  }

  const parsedMessage = JSON.parse(message);

  return callback(parsedMessage, context);
};

module.exports = parseMessage;
