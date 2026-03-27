// Per-session write serialization lock.
// Ensures read-modify-write cycles on the same session file never overlap.

const locks = new Map<string, Promise<void>>();

export function withSessionLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(sessionId) ?? Promise.resolve();

  let release: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });

  const result = prev.then(fn).finally(() => {
    release();
    if (locks.get(sessionId) === next) {
      locks.delete(sessionId);
    }
  });

  locks.set(sessionId, next);
  return result;
}
