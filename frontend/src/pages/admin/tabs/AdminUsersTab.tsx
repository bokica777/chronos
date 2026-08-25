import { useEffect, useState } from "react";
import { Button } from "../../../components/common/Button";
import type { User, UserRole } from "../../../models/user";
import { adminService } from "../../../services/adminService";
import { useAuth } from "../../../store/useAuth";
import { formatDateTime } from "../../../utils/date";

const roles: UserRole[] = ["Client", "Partner", "Admin"];

export function AdminUsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    adminService.users
      .getAll(controller.signal)
      .then((result) => {
        setUsers(result);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, []);

  const handleRoleChange = async (id: string, role: UserRole) => {
    setPendingId(id);
    try {
      const updated = await adminService.users.updateRole(id, role);
      setUsers((current) => current.map((item) => (item.id === id ? updated : item)));
    } catch {
      window.alert("Promena role nije uspela.");
    } finally {
      setPendingId(null);
    }
  };

  const handleToggleActive = async (user: User) => {
    setPendingId(user.id);
    try {
      const updated = await adminService.users.setActive(user.id, !user.isActive);
      setUsers((current) => current.map((item) => (item.id === user.id ? updated : item)));
    } catch {
      window.alert("Promena statusa naloga nije uspela.");
    } finally {
      setPendingId(null);
    }
  };

  if (status === "loading") return <div className="loading-spinner" />;
  if (status === "error") {
    return (
      <div className="empty-state">
        <p>Trenutno ne možemo da učitamo korisnike.</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="empty-state">
        <p>Nema registrovanih korisnika.</p>
      </div>
    );
  }

  return (
    <ul className="service-manage-list">
      {users.map((user) => {
        const isSelf = user.id === currentUser?.id;
        return (
          <li key={user.id} className="card service-manage-row">
            <div className="service-manage-info">
              <p className="eyebrow">{user.email}</p>
              <h3>{user.displayName}</h3>
              <p className="service-manage-meta">
                {user.createdAt ? `Registrovan ${formatDateTime(user.createdAt)}` : null}
              </p>
              <span className={`visibility-badge visibility-badge--${user.isActive ? "visible" : "hidden"}`}>
                {user.isActive ? "Aktivan" : "Deaktiviran"}
              </span>
            </div>
            <div className="service-manage-actions admin-user-actions">
              <select
                value={user.role}
                disabled={isSelf || pendingId === user.id}
                onChange={(event) => handleRoleChange(user.id, event.target.value as UserRole)}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant={user.isActive ? "danger" : "secondary"}
                disabled={isSelf || pendingId === user.id}
                onClick={() => handleToggleActive(user)}
              >
                {user.isActive ? "Deaktiviraj" : "Aktiviraj"}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
