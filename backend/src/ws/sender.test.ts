import { describe, it, expect } from 'vitest';
import { createSender } from './sender.js';

function fakeSocket() {
  const sent: string[] = [];
  return {
    sent,
    readyState: 1, // OPEN
    send(data: string) {
      sent.push(data);
    },
  };
}

describe('createSender', () => {
  it('serializes type and payload as JSON', () => {
    const socket = fakeSocket();
    const sender = createSender(socket as any);

    sender.send('test:output', { runId: '123', data: 'hello' });

    expect(socket.sent).toHaveLength(1);
    expect(JSON.parse(socket.sent[0])).toEqual({
      type: 'test:output',
      payload: { runId: '123', data: 'hello' },
    });
  });

  it('does not send when socket is not open', () => {
    const socket = fakeSocket();
    socket.readyState = 3; // CLOSED
    const sender = createSender(socket as any);

    sender.send('test:output', { data: 'hello' });

    expect(socket.sent).toHaveLength(0);
  });
});
