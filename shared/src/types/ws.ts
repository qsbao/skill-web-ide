export type WsMessageType =
  | 'test:output'
  | 'test:status'
  | 'test:result'
  | 'file:changed';

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
