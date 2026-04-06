import type { WsSender } from './types.js';

interface SocketLike {
  readyState: number;
  send(data: string): void;
}

const OPEN = 1;

export function createSender(socket: SocketLike): WsSender {
  return {
    send(type, payload) {
      if (socket.readyState === OPEN) {
        socket.send(JSON.stringify({ type, payload }));
      }
    },
  };
}
