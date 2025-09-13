/*
  Lightweight Socket.IO client wrapper for the app.

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
  if (socket && connectedUrl === serverUrl) return socket;

  const ioFn = await importSocketIoClient();
  if (!ioFn) return null;

  // Safe disconnect existing
  try {
    if (socket && socket.connected) socket.disconnect();
  } catch {
    /* ignore */
  }

  // Create socket with sensible defaults for mobile
  const anyIoFn = ioFn as any;
  const createSocket =
    typeof anyIoFn === "function"
      ? anyIoFn
      : anyIoFn && (anyIoFn.io || anyIoFn).io
      ? (anyIoFn.io || anyIoFn).io
      : null;
  if (typeof createSocket === "function") {
    socket = createSocket(serverUrl, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
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

  socket.on("connect", () => {
    console.log("[SocketService] connected", socket.id);
  });
  socket.on("disconnect", (reason: string) => {
    console.log("[SocketService] disconnected", reason);
  });
  socket.on("connect_error", (err: any) => {
    console.warn("[SocketService] connect_error", err?.message || err);
  });

  return socket;
}

export function disconnectSocket() {
  try {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
      connectedUrl = null;
    }
  } catch (err) {
    console.warn("[SocketService] disconnect error", err);
  }
}

export function on(event: string, cb: (...args: any[]) => void) {
  if (!socket) {
    console.warn(
      "[SocketService] on() called before socket initialization",
      event
    );
    return;
  }
  socket.on(event, cb);
}

export function off(event: string, cb?: (...args: any[]) => void) {
  if (!socket) return;
  if (cb) socket.off(event, cb);
  else socket.removeAllListeners(event);
}

export function emit(event: string, data?: any) {
  if (!socket) {
    console.warn(
      "[SocketService] emit() called before socket initialization",
      event,
      data
    );
    return;
  }
  socket.emit(event, data);
}

export function getSocketInstance() {
  return socket;
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
};
