import { useEffect, useRef, useCallback } from 'react';
import { useTestStore } from '../stores/testStore';
import { useRunStore } from '../stores/runStore';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const { addOutput, setRunning, setLastStatus } = useTestStore();
  const {
    addOutput: addRunOutput,
    setRunning: setRunRunning,
    setLastStatus: setRunLastStatus,
    setActiveRunId,
  } = useRunStore();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          // Test messages
          case 'test:output':
            addOutput({ stream: msg.payload.stream, data: msg.payload.data });
            break;
          case 'test:status':
            setLastStatus(msg.payload.status);
            if (msg.payload.status !== 'running') {
              setRunning(false);
            }
            break;
          case 'test:started':
            setRunning(true);
            break;
          // Run messages
          case 'run:output':
            addRunOutput({ stream: msg.payload.stream, data: msg.payload.data });
            break;
          case 'run:status':
            setRunLastStatus(msg.payload.status);
            if (msg.payload.status !== 'running') {
              setRunRunning(false);
            }
            break;
          case 'run:started':
            setRunRunning(true);
            setActiveRunId(msg.payload.id);
            break;
        }
      };

      ws.onclose = () => {
        setTimeout(connect, 2000);
      };
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [addOutput, setRunning, setLastStatus, addRunOutput, setRunRunning, setRunLastStatus, setActiveRunId]);

  const sendMessage = useCallback((action: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, payload }));
    }
  }, []);

  return { sendMessage };
}
