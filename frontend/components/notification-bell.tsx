"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  ApiError,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationItem,
  SOCKET_BASE_URL
} from "../lib/api";
import { clearAccessToken, getAccessToken } from "../lib/auth";

type NotificationCreatedPayload = {
  id: string;
  title: string;
  content: string;
  type: "message" | "material" | "system";
  relatedId?: string;
  createdAt: string;
};

export function NotificationBell() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    void loadInitial();

    const socket: Socket = io(`${SOCKET_BASE_URL}/chat`, {
      auth: {
        token: `Bearer ${token}`
      }
    });

    socket.on("connect_error", () => {
      clearAccessToken();
      router.replace("/");
    });

    socket.on("notification.created", (payload: NotificationCreatedPayload) => {
      const mapped: NotificationItem = {
        id: payload.id,
        title: payload.title,
        content: payload.content,
        type: payload.type,
        isRead: false,
        createdAt: payload.createdAt,
        relatedId: payload.relatedId ?? null
      };
      setItems((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)].slice(0, 20));
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    void markAllReadIfNeeded();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (containerRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [items]
  );

  async function loadInitial() {
    try {
      const [notifications, unread] = await Promise.all([
        getNotifications(),
        getUnreadNotificationCount()
      ]);
      setItems(notifications.items ?? []);
      setUnreadCount(unread.count ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const status = err instanceof ApiError ? err.status : undefined;
      if (status === 401 || message.includes("NO_TOKEN") || message.includes("Unauthorized")) {
        clearAccessToken();
        router.replace("/");
      }
    }
  }

  async function markAllReadIfNeeded() {
    if (unreadCount <= 0) {
      return;
    }

    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch {
      // no-op
    }
  }

  function formatRelative(value: string) {
    const diffMs = Date.now() - new Date(value).getTime();
    if (diffMs < 60_000) return "just now";
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHour = Math.floor(diffMin / 60);
    return `${diffHour} hour ago`;
  }

  async function onNotificationClick(item: NotificationItem) {
    try {
      await markNotificationRead(item.id);
    } catch {
      // no-op
    }

    setItems((prev) =>
      prev.map((notification) =>
        notification.id === item.id ? { ...notification, isRead: true } : notification
      )
    );
    setUnreadCount((prev) => Math.max(prev - (item.isRead ? 0 : 1), 0));
    setOpen(false);

    if (item.type === "message" && item.relatedId) {
      router.push(`/chat?roomId=${item.relatedId}`);
      return;
    }

    if ((item.type === "material" || item.referenceType === "material") && item.relatedId) {
      router.push(`/materials/${item.relatedId}`);
      return;
    }

    if ((item.type === "group_invite" || item.referenceType === "group") && item.relatedId) {
      router.push(`/groups/${item.relatedId}`);
      return;
    }

    if (
      (item.type === "friend_request_received" ||
        item.type === "friend_request_accepted" ||
        item.type === "follow_received") &&
      item.relatedId
    ) {
      router.push(`/users/${item.relatedId}`);
      return;
    }

    router.push("/chat");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(127,183,220,0.18)] bg-[rgba(7,17,27,0.72)] text-sm transition hover:bg-[rgba(56,128,176,0.14)]"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 ? (
          <span className="absolute -right-2 -top-2 min-w-[18px] rounded-full bg-cyan-500 px-1 text-[11px] font-semibold text-slate-950">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed left-4 right-4 top-20 z-50 rounded-[1.5rem] border border-[rgba(127,183,220,0.18)] bg-[linear-gradient(180deg,rgba(10,21,33,0.98),rgba(8,19,29,0.98))] p-2 shadow-[0_28px_80px_rgba(4,10,16,0.4)] backdrop-blur sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:min-w-[20rem]">
          <div className="mb-2 flex items-center justify-between px-2 py-2">
            <p className="text-sm font-medium">Notifications</p>
            <span className="text-xs text-slate-400">{unreadCount} unread</span>
          </div>

          <div className="isu-scroll max-h-[60vh] space-y-1 overflow-y-auto sm:max-h-80">
            {sortedItems.length === 0 ? (
              <p className="px-3 py-4 text-xs text-slate-400">No notifications yet.</p>
            ) : (
              sortedItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void onNotificationClick(item)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition hover:border-[rgba(127,183,220,0.26)] hover:bg-[rgba(16,33,49,0.84)] ${
                    item.isRead
                      ? "border-transparent bg-transparent opacity-80"
                      : "border-[rgba(127,183,220,0.12)] bg-[rgba(16,33,49,0.76)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-100">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">{item.content}</p>
                    </div>
                    {!item.isRead ? (
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#54a4da]" />
                    ) : null}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">{formatRelative(item.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
