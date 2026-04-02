export type WsMessageType =
  | 'test:output'
  | 'test:status'
  | 'test:result'
  | 'file:changed'
  | 'run:output'
  | 'run:status'
  | 'run:started'
  | 'playground:chat:text'
  | 'playground:chat:status'
  | 'playground:chat:session'
  | 'playground:chat:started'
  | 'playground:chat:tool_use'
  | 'playground:single:output'
  | 'playground:single:status'
  | 'playground:single:started'
  | 'prompt-lab:run:progress'
  | 'prompt-lab:run:complete'
  | 'prompt-lab:opt:iteration'
  | 'prompt-lab:opt:complete';

export interface WsMessage {
  type: WsMessageType;
  payload: unknown;
}

export interface TestOutputMessage extends WsMessage {
  type: 'test:output';
  payload: {
    runId: string;
    stream: 'stdout' | 'stderr';
    data: string;
  };
}

export interface TestStatusMessage extends WsMessage {
  type: 'test:status';
  payload: {
    runId: string;
    status: string;
  };
}

export interface TestResultMessage extends WsMessage {
  type: 'test:result';
  payload: {
    runId: string;
    results: unknown[];
  };
}

export interface FileChangedMessage extends WsMessage {
  type: 'file:changed';
  payload: {
    skillId: string;
    path: string;
  };
}

export interface RunOutputMessage extends WsMessage {
  type: 'run:output';
  payload: {
    runId: string;
    stream: 'stdout' | 'stderr';
    data: string;
  };
}

export interface RunStatusMessage extends WsMessage {
  type: 'run:status';
  payload: {
    runId: string;
    status: string;
  };
}
