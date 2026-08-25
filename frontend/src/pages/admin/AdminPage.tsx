import { useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { adminService } from "../../services/adminService";
import { useAuth } from "../../store/useAuth";
import { AdminBookingsTab } from "./tabs/AdminBookingsTab";
import { AdminCategoriesTab } from "./tabs/AdminCategoriesTab";
import { AdminNotificationsTab } from "./tabs/AdminNotificationsTab";
import { AdminPaymentsTab } from "./tabs/AdminPaymentsTab";
import { AdminProvidersTab } from "./tabs/AdminProvidersTab";
import { AdminServicesTab } from "./tabs/AdminServicesTab";
import { AdminUsersTab } from "./tabs/AdminUsersTab";

type AdminTab =
  | "users"
  | "categories"
  | "providers"
  | "services"
  | "bookings"
  | "notifications"
  | "payments";

const tabs: { id: AdminTab; label: string }[] = [
  { id: "users", label: "Korisnici" },
  { id: "categories", label: "Kategorije" },
  { id: "providers", label: "Provajderi" },
  { id: "services", label: "Usluge" },
  { id: "bookings", label: "Rezervacije" },
  { id: "notifications", label: "Obaveštenja" },
  { id: "payments", label: "Plaćanja" },
];

type Stats = {
  users: number;
  categories: number;
  providers: number;
  services: number;
  bookings: number;
  notifications: number;
  payments: number;
};

export function AdminPage() {
  useDocumentTitle("Admin panel");

  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!user || user.role !== "Admin") return;

    const controller = new AbortController();
    Promise.all([
      adminService.users.getAll(controller.signal),
      adminService.categories.getAll(controller.signal),
      adminService.providers.getAll(controller.signal),
      adminService.services.getAll(controller.signal),
      adminService.bookings.getAll(controller.signal),
      adminService.notifications.getAll(controller.signal),
      adminService.payments.getAll(controller.signal),
    ])
      .then(([users, categories, providers, services, bookings, notifications, payments]) => {
        setStats({
          users: users.length,
          categories: categories.length,
          providers: providers.length,
          services: services.length,
          bookings: bookings.length,
          notifications: notifications.length,
          payments: payments.length,
        });
      })
      .catch(() => {
        // Pregled brojki je samo "nice to have" - tabovi ionako ucitavaju svoje
        // podatke nezavisno, ne treba da blokiramo stranicu ako ovo ne uspe.
      });
    return () => controller.abort();
  }, [user]);

  if (!user || user.role !== "Admin") {
    return (
      <div className="empty-state">
        <p>Nemaš pristup ovoj stranici.</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Admin panel"
        description="Upravljaj korisnicima, kategorijama i moderiraj sadržaj na platformi."
      />

      {stats && (
        <div className="admin-stats-row">
          <div className="card admin-stat-card">
            <p className="admin-stat-value">{stats.users}</p>
            <p className="admin-stat-label">Korisnika</p>
          </div>
          <div className="card admin-stat-card">
            <p className="admin-stat-value">{stats.categories}</p>
            <p className="admin-stat-label">Kategorija</p>
          </div>
          <div className="card admin-stat-card">
            <p className="admin-stat-value">{stats.providers}</p>
            <p className="admin-stat-label">Provajdera</p>
          </div>
          <div className="card admin-stat-card">
            <p className="admin-stat-value">{stats.services}</p>
            <p className="admin-stat-label">Usluga</p>
          </div>
          <div className="card admin-stat-card">
            <p className="admin-stat-value">{stats.bookings}</p>
            <p className="admin-stat-label">Rezervacija</p>
          </div>
          <div className="card admin-stat-card">
            <p className="admin-stat-value">{stats.notifications}</p>
            <p className="admin-stat-label">Obaveštenja</p>
          </div>
          <div className="card admin-stat-card">
            <p className="admin-stat-value">{stats.payments}</p>
            <p className="admin-stat-label">Plaćanja</p>
          </div>
        </div>
      )}

      <div className="admin-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`admin-tab-button${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-tab-panel">
        {activeTab === "users" && <AdminUsersTab />}
        {activeTab === "categories" && <AdminCategoriesTab />}
        {activeTab === "providers" && <AdminProvidersTab />}
        {activeTab === "services" && <AdminServicesTab />}
        {activeTab === "bookings" && <AdminBookingsTab />}
        {activeTab === "notifications" && <AdminNotificationsTab />}
        {activeTab === "payments" && <AdminPaymentsTab />}
      </div>
    </>
  );
}
