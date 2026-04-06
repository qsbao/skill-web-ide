import * as testRunner from '../../services/test-runner.service.js';
import type { DomainHandler, WsSender } from '../types.js';
import type { TestType } from '@skill-ide/shared';

export const testHandler: DomainHandler = {
  prefix: 'test',

  handle(action, payload, sender) {
    if (action === 'test:run') {
      const { skillId, type } = payload as { skillId: string; type: TestType };

      const run = testRunner.runTest(
        skillId,
        type,
        (stream, data) => {
          sender.send('test:output', { runId: run.id, stream, data });
        },
        (status) => {
          sender.send('test:status', { runId: run.id, status });
        },
      );

      sender.send('test:started', run);
    }
  },
};
