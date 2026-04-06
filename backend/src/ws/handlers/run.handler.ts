import { v4 as uuid } from 'uuid';
import * as runService from '../../services/run.service.js';
import type { DomainHandler, WsSender } from '../types.js';

export const runHandler: DomainHandler = {
  prefix: 'run',

  handle(action, payload, sender) {
    if (action === 'run:run') {
      const { skillId, prompt } = payload as { skillId: string; prompt: string };
      const runId = uuid();

      runService
        .runSkill(
          skillId,
          prompt,
          (stream, data) => {
            sender.send('run:output', { runId, stream, data });
          },
          (status) => {
            sender.send('run:status', { runId, status });
          },
          runId,
        )
        .then((run) => {
          sender.send('run:started', run);
        })
        .catch((err) => {
          sender.send('error', String(err));
        });
    }
  },
};
