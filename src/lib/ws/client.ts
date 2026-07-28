import { useAlertStore } from '@/lib/store/useAlertStore';
import { useAuthStore } from '@/lib/store/useAuthStore';

let ws: WebSocket | null = null;
let reconnectInterval: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

export function connectWebSocket() {
  const token = useAuthStore.getState().accessToken;
  if (!token) return;

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const wsBase = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000';
  const wsUrl = `${wsBase}/ws/alerts/?token=${token}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket connected');
    useAlertStore.getState().setConnected(true);
    reconnectAttempts = 0;
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    } catch (e) {
      console.error('Failed to parse WS message', e);
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    useAlertStore.getState().setConnected(false);
    ws = null;
    scheduleReconnect();
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
    // onclose will handle reconnect
  };
}

export function disconnectWebSocket() {
  if (ws) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    } else if (ws.readyState === WebSocket.CONNECTING) {
      const socketToClose = ws;
      socketToClose.onopen = () => socketToClose.close();
    }
    ws = null;
  }
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }
  useAlertStore.getState().setConnected(false);
}

function scheduleReconnect() {
  if (reconnectInterval) return;
  const timeout = Math.min(5000 * Math.pow(1.5, reconnectAttempts), 30000);
  reconnectAttempts++;
  reconnectInterval = setTimeout(() => {
    reconnectInterval = null;
    connectWebSocket();
  }, timeout);
}

// The alerts WebSocket group broadcasts a flat, partial payload (see
// apps/alerts/services.py::broadcast_alert_event) that uses `alert_id`/`ts`
// instead of the REST API's `id`/`created_at`. Normalize it so consumers of
// the alert store (links, React keys, timestamps) get valid values.
function normalizeAlertPayload(raw: any) {
  if (!raw) return raw;
  return {
    ...raw,
    id: raw.id ?? raw.alert_id,
    created_at: raw.created_at ?? raw.ts,
  };
}

function handleWebSocketMessage(message: any) {
  const store = useAlertStore.getState();
  const eventType = message.event || message.type;

  switch (eventType) {
    case 'alert.created':
    case 'alert.updated':
    case 'alert.acknowledged':
    case 'alert.started':
    case 'alert.resolved':
    case 'alert.closed':
    case 'alert.escalated':
      store.addOrUpdateAlert(normalizeAlertPayload(message.data || message));
      break;
    case 'alert.deleted':
      store.removeAlert((message.data || message).id || (message.data || message).alert_id);
      break;
    case 'machine.status_changed':
    case 'machine_status_changed':
    case 'andon.changed':
      const d = message.data || message;
      store.updateMachineStatus(d.machine_id, d.color);
      break;
    case 'socket.connected':
    case 'pong':
    case 'ack':
      // Lifecycle events, no action needed
      break;
    default:
      console.log('Unknown WS message type:', eventType);
  }
}
