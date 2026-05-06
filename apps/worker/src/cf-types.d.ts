interface QueueMessage<T = unknown> {
  body: T;
  ack(): void;
}

interface MessageBatch<T = unknown> {
  messages: Array<QueueMessage<T>>;
}
