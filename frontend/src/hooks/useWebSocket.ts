import { useEffect, useRef, useCallback } from 'react';
import { useTestStore } from '../stores/testStore';
import { useRunStore } from '../stores/runStore';
import { usePlaygroundStore } from '../stores/playgroundStore';
import { useSessionStore } from '../stores/sessionStore';
import { api } from '../api/client';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const { addOutput, setRunning, setLastStatus } = useTestStore();
  const {
    addOutput: addRunOutput,
    setRunning: setRunRunning,
    setLastStatus: setRunLastStatus,
    setActiveRunId,
  } = useRunStore();
  const {
    appendToLastAssistant,
    setChatRunning,
    setSessionId,
    setInternalSessionId,
    addSingleOutput,
    setSingleRunning,
    setSingleLastStatus,
    setSingleActiveRunId,
    setChatActiveRunId,
    setChatOutputFiles,
  } = usePlaygroundStore();
  const { loadSessions } = useSessionStore();

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
          // Playground chat messages
          case 'playground:chat:text':
            appendToLastAssistant(msg.payload.text);
            break;
          case 'playground:chat:status':
            if (msg.payload.status !== 'running') {
              setChatRunning(false);
              if (msg.payload.status === 'failed' || msg.payload.status === 'error') {
                appendToLastAssistant('[Error: chat request failed]');
              }
              // Fetch work dir files after chat turn completes
              const { chatActiveRunId, selectedSkillId } = usePlaygroundStore.getState();
              if (chatActiveRunId && selectedSkillId) {
                api.getRunFiles(selectedSkillId, chatActiveRunId).then(setChatOutputFiles).catch(() => {});
              }
              // Refresh sessions list after chat completes
              loadSessions();
            }
            break;
          case 'playground:chat:internal-session':
            setInternalSessionId(msg.payload.internalSessionId);
            break;
          case 'playground:chat:session':
            setSessionId(msg.payload.sessionId);
            break;
          case 'playground:chat:started': {
            // Track first runId for file listing (work dir is created with first runId)
            const { chatActiveRunId: existingRunId } = usePlaygroundStore.getState();
            if (!existingRunId) {
              setChatActiveRunId(msg.payload.id);
            }
            break;
          }
          // Playground single-run messages
          case 'playground:single:output':
            addSingleOutput({ stream: msg.payload.stream, data: msg.payload.data });
            break;
          case 'playground:single:status':
            setSingleLastStatus(msg.payload.status);
            if (msg.payload.status !== 'running') {
              setSingleRunning(false);
              // Refresh sessions list after single-run completes
              loadSessions();
            }
            break;
          case 'playground:single:started':
            setSingleRunning(true);
            setSingleActiveRunId(msg.payload.id);
            break;
          case 'error':
            // Reset running states on error so UI isn't stuck
            setChatRunning(false);
            setSingleRunning(false);
            setSingleLastStatus('error');
            addSingleOutput({ stream: 'stderr', data: `[Error] ${msg.payload || 'Unknown error'}\n` });
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
  }, [
    addOutput, setRunning, setLastStatus,
    addRunOutput, setRunRunning, setRunLastStatus, setActiveRunId,
    appendToLastAssistant, setChatRunning, setSessionId, setInternalSessionId,
    addSingleOutput, setSingleRunning, setSingleLastStatus, setSingleActiveRunId,
    setChatActiveRunId, setChatOutputFiles,
    loadSessions,
  ]);

  const sendMessage = useCallback((action: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, payload }));
    }
  }, []);

  return { sendMessage };
}
