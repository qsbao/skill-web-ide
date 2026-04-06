import type { DomainHandler, WsSender } from './types.js';

export interface Router {
  dispatch(action: string, payload: unknown, sender: WsSender): void;
}

export function createRouter(handlers: DomainHandler[]): Router {
  // Sort by prefix length descending so longest prefix matches first
  const sorted = [...handlers].sort((a, b) => b.prefix.length - a.prefix.length);

  return {
    dispatch(action, payload, sender) {
      const handler = sorted.find((h) => action.startsWith(h.prefix));
      if (!handler) {
        sender.send('error', `Unknown action: ${action}`);
        return;
      }
      handler.handle(action, payload, sender);
    },
  };
}
