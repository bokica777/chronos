import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/common/Button";
import type { Category } from "../../../models/category";
import type { Provider } from "../../../models/provider";
import type { Service } from "../../../models/service";
import { adminService } from "../../../services/adminService";
import { resolveImageUrl } from "../../../utils/media";

type SortOption = "name-asc" | "price-asc" | "price-desc" | "provider-asc";

const sortLabels: Record<SortOption, string> = {
  "name-asc": "Naziv (A-Š)",
  "price-asc": "Cena (rastuće)",
  "price-desc": "Cena (opadajuće)",
  "provider-asc": "Partner (A-Š)",
};

export function AdminServicesTab() {
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      adminService.services.getAll(controller.signal),
      adminService.providers.getAll(controller.signal),
      adminService.categories.getAll(controller.signal),
    ])
      .then(([servicesResult, providersResult, categoriesResult]) => {
        setServices(servicesResult);
        setProviders(providersResult);
        setCategories(categoriesResult);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, []);

  const providersById = useMemo(() => new Map(providers.map((provider) => [provider.id, provider])), [providers]);
  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const handleToggleVisibility = async (service: Service) => {
    setPendingId(service.id);
    try {
      const updated = await adminService.services.setVisibility(service.id, !service.isActive);
      setServices((current) => current.map((item) => (item.id === service.id ? updated : item)));
    } catch {
      window.alert("Promena vidljivosti usluge nije uspela.");
    } finally {
      setPendingId(null);
    }
  };

  if (status === "loading") return <div className="loading-spinner" />;
  if (status === "error") {
    return (
      <div className="empty-state">
        <p>Trenutno ne možemo da učitamo usluge.</p>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="empty-state">
        <p>Nema definisanih usluga.</p>
      </div>
    );
  }

  const query = searchQuery.trim().toLowerCase();
  const visibleServices = services
    .filter((service) => {
      if (!query) return true;
      const provider = providersById.get(service.providerId);
      const category = categoriesById.get(service.categoryId);
      return (
        service.name.toLowerCase().includes(query) ||
        (provider?.name ?? "").toLowerCase().includes(query) ||
        (category?.name ?? "").toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "provider-asc":
          return (providersById.get(a.providerId)?.name ?? "").localeCompare(
            providersById.get(b.providerId)?.name ?? "",
            "sr",
          );
        default:
          return a.name.localeCompare(b.name, "sr");
      }
    });

  return (
    <>
      <div className="services-toolbar">
        <input
          type="search"
          className="services-search-input"
          placeholder="Pretraži po nazivu, partneru ili kategoriji..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <select
          className="services-sort-select"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortOption)}
        >
          {Object.entries(sortLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {visibleServices.length === 0 ? (
        <div className="empty-state">
          <p>Nijedna usluga ne odgovara pretrazi.</p>
        </div>
      ) : (
        <ul className="service-manage-list">
          {visibleServices.map((service) => {
        const provider = providersById.get(service.providerId);
        const category = categoriesById.get(service.categoryId);
        return (
          <li key={service.id} className="card service-manage-row">
            <div className="service-manage-media">
              {service.imageUrl && <img src={resolveImageUrl(service.imageUrl)} alt={service.name} />}
            </div>
            <div className="service-manage-info">
              <p className="eyebrow">{category?.name ?? "Bez kategorije"}</p>
              <h3>{service.name}</h3>
              <p className="service-manage-meta">
                {provider?.name ?? "Nepoznat partner"} · {service.durationMinutes} min · {service.price} RSD
              </p>
              <span className={`visibility-badge visibility-badge--${service.isActive ? "visible" : "hidden"}`}>
                {service.isActive ? "Vidljivo" : "Skriveno"}
              </span>
            </div>
            <div className="service-manage-actions">
              <Button
                type="button"
                variant={service.isActive ? "danger" : "secondary"}
                disabled={pendingId === service.id}
                onClick={() => handleToggleVisibility(service)}
              >
                {service.isActive ? "Sakrij" : "Prikaži"}
              </Button>
            </div>
          </li>
        );
          })}
        </ul>
      )}
    </>
  );
}
