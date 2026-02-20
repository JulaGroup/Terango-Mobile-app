import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { SecureStorage } from "@/utils/secureStorage";
import NotificationService from "@/services/notification.service";
import { notificationApi } from "@/lib/api";

export type AppNotification = {
  id: string;
  title?: string;
  body?: string;
  data?: any;
  opened?: boolean;
  sentAt?: number;
};

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: AppNotification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
};

const STORAGE_KEY = "app_notifications_v1";
const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // load persisted notifications
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AppNotification[];
          setNotifications(parsed);
        }
      } catch (e) {
        console.warn("Failed to load notifications from storage", e);
      }
    })();
  }, []);

  const persist = useCallback(async (next: AppNotification[]) => {
    setNotifications(next);
    try {
      await SecureStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to persist notifications", e);
    }
    // update OS badge
    try {
      const unread = next.filter((n) => !n.opened).length;
      await NotificationService.setBadgeCount(unread);
    } catch (e) {
      // non-fatal
    }
  }, []);

  const addNotification = useCallback((n: AppNotification) => {
    setNotifications((prev) => {
      if (prev.some((x) => x.id === n.id)) return prev; // dedupe
      const next = [
        { ...n, opened: !!n.opened, sentAt: n.sentAt ?? Date.now() },
        ...prev,
      ];
      SecureStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      NotificationService.setBadgeCount(
        next.filter((x) => !x.opened).length,
      ).catch(() => {});
      return next;
    });
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    let updated: AppNotification[] = [];
    setNotifications((prev) => {
      updated = prev.map((n) => (n.id === id ? { ...n, opened: true } : n));
      return updated;
    });

    try {
      await SecureStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to persist notifications after markAsRead", e);
    }

    try {
      await NotificationService.setBadgeCount(
        updated.filter((n) => !n.opened).length,
      );
    } catch (e) {}

    // server-side analytics (best-effort)
    try {
      if (id) await notificationApi.markOpened(id);
    } catch (e) {
      // don't block UI
      console.log("notification tracking failed", e);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const updated = notifications.map((n) => ({ ...n, opened: true }));
    await persist(updated);

    // best-effort server tracking for known ids
    (async () => {
      try {
        for (const n of updated) {
          if (n.id) await notificationApi.markOpened(n.id).catch(() => {});
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [notifications, persist]);

  const clearNotifications = useCallback(async () => {
    await persist([]);
  }, [persist]);

  // subscribe to runtime notification events (foreground)
  useEffect(() => {
    const received = NotificationService.addNotificationReceivedListener(
      (notification) => {
        const content = notification.request?.content || (notification as any);
        const id = content.data?.id ?? content.identifier ?? String(Date.now());
        addNotification({
          id,
          title: content.title ?? content.data?.title ?? "",
          body: content.body ?? content.data?.body ?? "",
          data: content.data ?? {},
          opened: false,
          sentAt: content.data?.sentAt ?? Date.now(),
        });
      },
    );

    const response = NotificationService.addNotificationResponseListener(
      (response) => {
        const id =
          response.notification?.request?.content?.data?.id ??
          response.notification?.request?.identifier;
        if (id) {
          markAsRead(String(id));
        }
      },
    );

    return () => {
      try {
        received.remove();
      } catch (e) {}
      try {
        response.remove();
      } catch (e) {}
    };
  }, [addNotification, markAsRead]);

  const unreadCount = notifications.filter((n) => !n.opened).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    // graceful fallback (prevents crashes when provider is missing)
    return {
      notifications: [],
      unreadCount: 0,
      addNotification: () => {},
      markAsRead: async () => {},
      markAllAsRead: async () => {},
      clearNotifications: async () => {},
    };
  }
  return ctx;
};

export default NotificationContext;
