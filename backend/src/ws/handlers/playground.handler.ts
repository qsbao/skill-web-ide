import type { PlaygroundSessionManager, PlaygroundRunHandle } from '../../services/playground/index.js';
import type { DomainHandler, WsSender } from '../types.js';

export function makePlaygroundHandler(manager: PlaygroundSessionManager): DomainHandler {
  return {
    prefix: 'playground',

    handle(action, payload, sender) {
      if (action === 'playground:chat') {
        const { skillId, prompt, sessionId, internalSessionId } = payload as any;
        const handle = manager.chat({ skillId, prompt, sessionId: internalSessionId, claudeSessionId: sessionId });
        streamTo(sender, 'playground:chat', handle);
      } else if (action === 'playground:single') {
        const { skillId, prompt } = payload as any;
        const handle = manager.run({ skillId, prompt });
        streamTo(sender, 'playground:single', handle);
      }
    },
  };
}

async function streamTo(sender: WsSender, prefix: string, handle: PlaygroundRunHandle): Promise<void> {
  try {
    for await (const evt of handle.events) {
      if (evt.type === 'started' && prefix === 'playground:chat') {
        sender.send(`${prefix}:internal-session`, { runId: evt.runId, internalSessionId: evt.sessionId });
      }
      sender.send(`${prefix}:${evt.type}`, evt);
    }
  } catch (err) {
    sender.send('error', String(err));
  }
}