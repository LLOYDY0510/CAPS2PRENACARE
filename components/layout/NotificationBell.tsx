'use client';

import { useState } from 'react';

export type NotificationBellItem = {
  id: string;
  title: string;
  message: string;
  category: string;
  read_at: string | null;
  created_at: string;
};

export default function NotificationBell({ initialNotifications }: { initialNotifications: NotificationBellItem[] }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  async function markRead(id: string) {
    const response = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    });
    if (response.ok) setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, read_at: new Date().toISOString() } : notification));
  }

  async function markAllRead() {
    const response = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    if (response.ok) setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at ?? new Date().toISOString() })));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <span aria-hidden className="text-lg">🔔</span>
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-2rem))] bg-white text-ink border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold">Notifications</h2>
            {unreadCount > 0 && <button type="button" onClick={markAllRead} className="text-xs text-brand hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-[min(70vh,460px)] overflow-y-auto">
            {notifications.length === 0 ? <p className="px-4 py-8 text-center text-sm text-muted-2">No notifications yet.</p> : notifications.map((notification) => (
              <button key={notification.id} type="button" onClick={() => markRead(notification.id)} className={`block w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${notification.read_at ? '' : 'bg-brand-light/40'}`}>
                <div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold text-ink">{notification.title}</p>{!notification.read_at && <span className="mt-1 w-2 h-2 rounded-full bg-brand shrink-0" aria-label="Unread" />}</div>
                <p className="text-xs text-gray-600 mt-1 line-clamp-3">{notification.message}</p>
                <p className="text-[10px] text-muted-2 mt-1">{new Date(notification.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
