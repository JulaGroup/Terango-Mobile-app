/*
  FIX: Improved Socket.IO client wrapper with exponential backoff reconnection
  
  ISSUE: Socket would disconnect on network switch (WiFi ↔ Mobile data) 
  but wouldn't auto-reconnect, causing real-time tracking to stop.
  
  SOLUTION:
  - Exponential backoff for reconnection attempts (1s, 2s, 4s, 8s, 16s)
  - Max 15 reconnection attempts before giving up
  - Better connection state tracking
  - Automatic cleanup on disconnect
  
  - initSocket(serverUrl) -> connects (idempotent)
  - disconnectSocket() -> disconnects
  - on(event, cb) / off(event, cb) -> add/remove listeners
  - emit(event, data) -> emit events to server
  - useSocket(effect, deps) -> React hook to run effect with socket instance

  Notes:
  - Run: npm install socket.io-client
  - The module dynamically guards against missing dependency and logs an actionable error.
*/

import { useEffect, useRef } from "react";

type SocketAny = any;

let socket: SocketAny | null = null;
let connectedUrl: string | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 15;

async function importSocketIoClient() {
  try {
    const mod = await import("socket.io-client");
    return mod.default || mod;
  } catch {
    console.error(
      "Socket.IO client not found. Install it with: npm install socket.io-client"
    );
    return null;
  }
}

export async function initSocket(
  serverUrl: string,
  opts: Record<string, any> = {}
) {
  if (!serverUrl) throw new Error("initSocket requires a serverUrl");
  if (socket && connectedUrl === serverUrl) {
    console.log("[SocketService] Socket already connected to", serverUrl);
    return socket;
  }

  const ioFn = await importSocketIoClient();
  if (!ioFn) return null;

  // Safe disconnect existing
  try {
    if (socket && socket.connected) socket.disconnect();
  } catch {
    /* ignore */
  }

  // Create socket with exponential backoff for reconnection
  const anyIoFn = ioFn as any;
  const createSocket =
    typeof anyIoFn === "function"
      ? anyIoFn
      : anyIoFn && (anyIoFn.io || anyIoFn).io
      ? (anyIoFn.io || anyIoFn).io
      : null;
  if (typeof createSocket === "function") {
    socket = createSocket(serverUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000, // Start with 1 second
      reconnectionDelayMax: 30000, // Max 30 seconds
      reconnectionAttempts: maxReconnectAttempts,
      autoConnect: true,
      ...opts,
    });
  } else {
    console.error(
      "[SocketService] Unable to construct socket - incompatible socket.io-client export"
    );
    return null;
  }

  connectedUrl = serverUrl;
  reconnectAttempts = 0;

  // FIX: Improved connection event handlers
  socket.on("connect", () => {
    console.log(
      "[SocketService] ✅ Connected successfully (id:",
      socket.id,
      ")"
    );
    reconnectAttempts = 0; // Reset counter on successful connection
  });

  socket.on("disconnect", (reason: string) => {
    console.log("[SocketService] ❌ Disconnected - reason:", reason);

    // If disconnected due to server/network issues, log it
    if (reason === "io server disconnect") {
      console.warn(
        "[SocketService] Server disconnected client - will attempt reconnection"
      );
    } else if (reason === "io client disconnect") {
      console.log("[SocketService] Client intentionally disconnected");
    } else if (reason === "ping timeout") {
      console.warn(
        "[SocketService] Connection timeout - network issue detected"
      );
    }
  });

  socket.on("connect_error", (err: any) => {
    console.warn("[SocketService] ⚠️ Connection error:", err?.message || err);
  });

  socket.on("reconnect_attempt", () => {
    reconnectAttempts++;
    const delayMs = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
    console.log(
      `[SocketService] 🔄 Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts} (next delay: ${delayMs}ms)`
    );
  });

  socket.on("reconnect_failed", () => {
    console.error(
      `[SocketService] ❌ Reconnection failed after ${maxReconnectAttempts} attempts`
    );
  });

  return socket;
}

export function disconnectSocket() {
  try {
    if (socket) {
      console.log("[SocketService] Disconnecting socket...");
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
      connectedUrl = null;
      reconnectAttempts = 0;
      console.log("[SocketService] ✅ Socket disconnected and cleaned up");
    }
  } catch (err) {
    console.warn("[SocketService] Error during disconnect:", err);
  }
}

export function on(event: string, cb: (...args: any[]) => void) {
  if (!socket) {
    console.warn(
      "[SocketService] ⚠️ on() called before socket initialization for event:",
      event
    );
    return;
  }
  socket.on(event, cb);
  console.debug(`[SocketService] Registered listener for event: ${event}`);
}

export function off(event: string, cb?: (...args: any[]) => void) {
  if (!socket) return;
  if (cb) {
    socket.off(event, cb);
    console.debug(
      `[SocketService] Removed specific listener for event: ${event}`
    );
  } else {
    socket.removeAllListeners(event);
    console.debug(`[SocketService] Removed all listeners for event: ${event}`);
  }
}

export function emit(event: string, data?: any) {
  if (!socket) {
    console.warn(
      "[SocketService] ⚠️ emit() called before socket initialization for event:",
      event
    );
    return;
  }
  socket.emit(event, data);
  console.debug(`[SocketService] Emitted event: ${event}`, data);
}

export function getSocketInstance() {
  return socket;
}

export function isSocketConnected(): boolean {
  return socket !== null && socket.connected === true;
}

// React hook helper. Usage:
// useSocket((s) => { s.on('paymentSuccess', handler); return () => { s.off('paymentSuccess', handler); } }, [deps])
export function useSocket(
  effect: (s: SocketAny | null) => void | (() => void),
  deps: any[] = []
) {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
    const s = socket;
    const cleanup = effectRef.current(s);
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default {
  initSocket,
  disconnectSocket,
  on,
  off,
  emit,
  getSocketInstance,
  isSocketConnected,
};
