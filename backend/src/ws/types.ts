export interface WsSender {
  send(type: string, payload: unknown): void;
}

export interface DomainHandler {
  readonly prefix: string;
  handle(action: string, payload: unknown, sender: WsSender): void;
}
