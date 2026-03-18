import { useEffect, useRef, useCallback } from 'react';
import { useTestStore } from '../stores/testStore';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const { addOutput, setRunning, setLastStatus } = useTestStore();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
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
  }, [addOutput, setRunning, setLastStatus]);

  const sendMessage = useCallback((action: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, payload }));
    }
  }, []);

  return { sendMessage };
}
