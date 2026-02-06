import { io, Socket } from "socket.io-client";
import { API_URL } from "@/constants/config";
import { SecureStorage } from "@/utils/secureStorage";

export type SocketEventType =
  | "new_order"
  | "order_status_changed"
  | "menu_item_updated"
  | "vendor_notification"
  | "connection_status";

export interface SocketEvent {
  type: SocketEventType;
  data: any;
}

export type SocketListener = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<SocketListener>> = new Map();
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private connectionStatusListeners = new Set<(connected: boolean) => void>();

  /**
   * Connect to WebSocket server
   */
  async connect(vendorId?: string): Promise<boolean> {
    if (this.socket?.connected) {
      console.log("✅ WebSocket already connected");
      return true;
    }

    if (this.isConnecting) {
      console.log("⏳ WebSocket connection in progress...");
      return false;
    }

    this.isConnecting = true;

    try {
      const authToken = await SecureStorage.getItem("authToken");

      const socketUrl = API_URL.replace(/^http/, "ws");

      this.socket = io(socketUrl, {
        auth: {
          token: authToken,
          vendorId,
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 10000,
      });

      this.setupEventListeners();

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.isConnecting = false;
          resolve(false);
        }, 10000);

        this.socket?.on("connect", () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          console.log("✅ WebSocket connected:", this.socket?.id);
          this.notifyConnectionStatus(true);
          resolve(true);
        });

        this.socket?.on("connect_error", (error) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          console.error("❌ WebSocket connection error:", error);
          resolve(false);
        });
      });
    } catch (error) {
      console.error("❌ Failed to connect WebSocket:", error);
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * Setup socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on("disconnect", (reason) => {
      console.log("⚠️ WebSocket disconnected:", reason);
      this.notifyConnectionStatus(false);

      if (reason === "io server disconnect") {
        // Server disconnected, try to reconnect
        this.reconnect();
      }
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log(`✅ WebSocket reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
      this.notifyConnectionStatus(true);
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 WebSocket reconnection attempt ${attemptNumber}`);
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("❌ WebSocket reconnection error:", error);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("❌ WebSocket reconnection failed after max attempts");
      this.notifyConnectionStatus(false);
    });

    // Listen for custom events
    this.socket.on("new_order", (data) => {
      console.log("📦 New order received via WebSocket:", data);
      this.notifyListeners("new_order", data);
    });

    this.socket.on("order_status_changed", (data) => {
      console.log("🔄 Order status changed via WebSocket:", data);
      this.notifyListeners("order_status_changed", data);
    });

    this.socket.on("menu_item_updated", (data) => {
      console.log("🍔 Menu item updated via WebSocket:", data);
      this.notifyListeners("menu_item_updated", data);
    });

    this.socket.on("vendor_notification", (data) => {
      console.log("🔔 Vendor notification via WebSocket:", data);
      this.notifyListeners("vendor_notification", data);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log("❌ WebSocket disconnected");
      this.notifyConnectionStatus(false);
    }
  }

  /**
   * Reconnect to WebSocket server
   */
  async reconnect(): Promise<boolean> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("❌ Max reconnection attempts reached");
      return false;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}`);

    await new Promise((resolve) => setTimeout(resolve, this.reconnectDelay));

    return this.connect();
  }

  /**
   * Join vendor room (for targeted events)
   */
  joinVendorRoom(vendorId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("join_vendor_room", vendorId);
      console.log(`🏪 Joined vendor room: ${vendorId}`);
    }
  }

  /**
   * Leave vendor room
   */
  leaveVendorRoom(vendorId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("leave_vendor_room", vendorId);
      console.log(`🚪 Left vendor room: ${vendorId}`);
    }
  }

  /**
   * Subscribe to specific event
   */
  on(event: SocketEventType, listener: SocketListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(listener);
  }

  /**
   * Unsubscribe from specific event
   */
  off(event: SocketEventType, listener: SocketListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionStatus(listener: (connected: boolean) => void): void {
    this.connectionStatusListeners.add(listener);
  }

  /**
   * Unsubscribe from connection status changes
   */
  offConnectionStatus(listener: (connected: boolean) => void): void {
    this.connectionStatusListeners.delete(listener);
  }

  /**
   * Notify all listeners for a specific event
   */
  private notifyListeners(event: SocketEventType, data: any): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in listener for ${event}:`, error);
      }
    });
  }

  /**
   * Notify connection status listeners
   */
  private notifyConnectionStatus(connected: boolean): void {
    this.connectionStatusListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (error) {
        console.error("Error in connection status listener:", error);
      }
    });
  }

  /**
   * Emit custom event to server
   */
  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn("⚠️ Cannot emit event, socket not connected");
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Clear all listeners
   */
  clearListeners(): void {
    this.listeners.clear();
    this.connectionStatusListeners.clear();
  }
}

export default new WebSocketService();
