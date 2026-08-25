import { useEffect, useState } from "react";
import type { Notification } from "../../../models/notification";
import { adminService } from "../../../services/adminService";
import { formatDateTime } from "../../../utils/date";

const typeLabels: Record<Notification["type"], string> = {
  BOOKING_CREATED: "Rezervacija kreirana",
  BOOKING_CANCELLED: "Rezervacija otkazana",
};

export function AdminNotificationsTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    const controller = new AbortController();
    adminService.notifications
      .getAll(controller.signal)
      .then((result) => {
        setNotifications(result);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, []);

  if (status === "loading") return <div className="loading-spinner" />;
  if (status === "error") {
    return (
      <div className="empty-state">
        <p>Trenutno ne možemo da učitamo obaveštenja.</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="empty-state">
        <p>Notification servis još nije obradio nijedan događaj.</p>
      </div>
    );
  }

  return (
    <ul className="service-manage-list">
      {notifications.map((notification) => (
        <li key={notification.id} className="card service-manage-row">
          <div className="service-manage-info">
            <p className="eyebrow">{typeLabels[notification.type]}</p>
            <h3>{notification.message}</h3>
            <p className="service-manage-meta">
              Kanal: {notification.channel} · {formatDateTime(notification.createdAt)}
            </p>
          </div>
          <div className="service-manage-actions">
            <span
              className={`visibility-badge visibility-badge--${
                notification.status === "SENT" ? "visible" : "hidden"
              }`}
            >
              {notification.status === "SENT" ? "Poslato" : "Neuspešno"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
