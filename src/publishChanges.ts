import { EventContext, Change } from 'firebase-functions';

import { PubSub } from '@google-cloud/pubsub';
import { DocumentSnapshot } from 'firebase-functions/lib/providers/firestore';

const pubsub = new PubSub();

export default (topic: string) =>
  async (
    change: Change<DocumentSnapshot> | DocumentSnapshot,
    context: EventContext
  ) => {
    const { eventType } = context;

    const type = eventType.split('google.firestore.document.').pop();

    let eventData;

    if (type === 'create' && 'data' in change) {
      eventData = change.data(); // Need types for the rename of `before` to just `data`
    } else if (type === 'update' && 'after' in change) {
      eventData = change.after.data();
    } else if (type === 'delete' && 'data' in change) {
      eventData = change.data();
    }

    const data = JSON.stringify({
      type,
      data: eventData,
      ...(type === 'update' && 'before' in change
        ? { dataBefore: change.before.data() }
        : {}),
      changeContext: context,
    });

    const dataBuffer = Buffer.from(data);

    return pubsub.topic(topic).publish(dataBuffer);
  };
