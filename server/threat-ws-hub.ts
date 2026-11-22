import crypto from 'crypto';
import type { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { Incident, RealtimeThreatAlert, SecurityEvent } from '../src/core/types';

let wss: WebSocketServer | null = null;
let alertBuffer: RealtimeThreatAlert[] = [];
let heartbeatInterval: NodeJS.Timeout | null = null;

function computeSha256(payload: string): string {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function getThreatAlertHistory(limit = 30): RealtimeThreatAlert[] {
  return alertBuffer.slice(0, limit);
}

export function getConnectedThreatClientsCount(): number {
  if (!wss) return 0;
  let count = 0;
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) count += 1;
  }
  return count;
}

export function publishThreatAlert(
  input: Omit<RealtimeThreatAlert, 'id' | 'timestamp' | 'sha256Integrity'> & {
    id?: string;
    timestamp?: string;
  }
): RealtimeThreatAlert {
  const timestamp = input.timestamp || new Date().toISOString();
  const id = input.id || `WS-ALT-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
  const sha256Integrity = computeSha256(
    `${id}|${timestamp}|${input.severity}|${input.category}|${input.targetAsset}|${input.title}`
  );

  const alert: RealtimeThreatAlert = {
    ...input,
    id,
    timestamp,
    sha256Integrity,
  };

  alertBuffer.unshift(alert);
  if (alertBuffer.length > 80) {
    alertBuffer = alertBuffer.slice(0, 80);
  }

  if (wss) {
    const frame = JSON.stringify({
      type: 'alert',
      alert,
      connectedClients: getConnectedThreatClientsCount(),
    });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(frame);
        } catch {
          // Ignore closed socket races
        }
      }
    }
  }

  return alert;
}

export function initThreatWebSocketServer(
  httpServer: HttpServer,
  initialSeed?: { incidents: Incident[]; events: SecurityEvent[] }
) {
  if (initialSeed && alertBuffer.length === 0) {
    const seeded: RealtimeThreatAlert[] = [];
    for (const inc of initialSeed.incidents.slice(0, 3)) {
      const ts = inc.detectedAt || new Date().toISOString();
      seeded.push({
        id: `WS-SEED-${inc.id}`,
        timestamp: ts,
        severity: inc.severity,
        source: inc.assignedAgents[0] || 'Blue Force Sentinel',
        category: inc.state === 'contained' ? 'BLUE_FORCE_CONTAINMENT' : 'LIVE_INTRUSION',
        title: `${inc.id}: ${inc.title}`,
        summary: inc.summary,
        targetAsset: inc.affectedAssets[0] || 'cluster-inference-01',
        actionTaken: inc.state.toUpperCase(),
        sha256Integrity: computeSha256(`${inc.id}|${ts}|${inc.title}`),
        incidentId: inc.id,
      });
    }
    for (const ev of initialSeed.events.slice(0, 4)) {
      seeded.push({
        id: `WS-EVT-${ev.id}`,
        timestamp: ev.timestamp,
        severity: ev.severity,
        source: ev.source,
        category: 'TELEMETRY_EVENT',
        title: ev.signature,
        summary: `${ev.category} (${ev.source} -> ${ev.destination})`,
        targetAsset: ev.destination,
        actionTaken: ev.actionTaken,
        sha256Integrity: computeSha256(`${ev.id}|${ev.timestamp}|${ev.signature}`),
      });
    }
    alertBuffer = seeded.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  }

  if (wss) return wss;

  wss = new WebSocketServer({
    server: httpServer,
    path: '/ws/threat-feed',
  });

  wss.on('connection', (socket) => {
    try {
      socket.send(
        JSON.stringify({
          type: 'init',
          alerts: getThreatAlertHistory(30),
          connectedClients: getConnectedThreatClientsCount(),
          serverTime: new Date().toISOString(),
        })
      );
    } catch {
      // Ignore send error on immediate close
    }

    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg?.type === 'ping') {
          socket.send(
            JSON.stringify({
              type: 'pong',
              serverTime: new Date().toISOString(),
              connectedClients: getConnectedThreatClientsCount(),
            })
          );
        }
      } catch {
        // Ignore malformed client frames
      }
    });
  });

  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(() => {
      if (!wss) return;
      const heartbeat = JSON.stringify({
        type: 'heartbeat',
        serverTime: new Date().toISOString(),
        connectedClients: getConnectedThreatClientsCount(),
      });
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(heartbeat);
          } catch {
            // Ignore closed client
          }
        }
      }
    }, 20_000);
  }

  return wss;
}
