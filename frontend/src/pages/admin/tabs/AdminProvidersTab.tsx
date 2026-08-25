import { useEffect, useState } from "react";
import { Button } from "../../../components/common/Button";
import type { Provider } from "../../../models/provider";
import { adminService } from "../../../services/adminService";
import { resolveImageUrl } from "../../../utils/media";

export function AdminProvidersTab() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    adminService.providers
      .getAll(controller.signal)
      .then((result) => {
        setProviders(result);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, []);

  const handleToggleVisibility = async (provider: Provider) => {
    setPendingId(provider.id);
    try {
      const updated = await adminService.providers.setVisibility(provider.id, !provider.isActive);
      setProviders((current) => current.map((item) => (item.id === provider.id ? updated : item)));
    } catch {
      window.alert("Promena vidljivosti provajdera nije uspela.");
    } finally {
      setPendingId(null);
    }
  };

  if (status === "loading") return <div className="loading-spinner" />;
  if (status === "error") {
    return (
      <div className="empty-state">
        <p>Trenutno ne možemo da učitamo provajdere.</p>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="empty-state">
        <p>Nema registrovanih provajdera.</p>
      </div>
    );
  }

  return (
    <ul className="service-manage-list">
      {providers.map((provider) => (
        <li key={provider.id} className="card service-manage-row">
          <div className="service-manage-media">
            {provider.imageUrl && <img src={resolveImageUrl(provider.imageUrl)} alt={provider.name} />}
          </div>
          <div className="service-manage-info">
            <h3>{provider.name}</h3>
            {provider.address && <p className="service-manage-meta">{provider.address}</p>}
            <span className={`visibility-badge visibility-badge--${provider.isActive ? "visible" : "hidden"}`}>
              {provider.isActive ? "Vidljivo klijentima" : "Skriveno"}
            </span>
          </div>
          <div className="service-manage-actions">
            <Button
              type="button"
              variant={provider.isActive ? "danger" : "secondary"}
              disabled={pendingId === provider.id}
              onClick={() => handleToggleVisibility(provider)}
            >
              {provider.isActive ? "Sakrij" : "Prikaži"}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
