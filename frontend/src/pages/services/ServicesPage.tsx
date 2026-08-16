import { useEffect, useMemo, useState } from "react";
import { routes } from "../../app/router/routes";
import { PageHeader } from "../../components/common/PageHeader";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import type { Category } from "../../models/category";
import type { Provider } from "../../models/provider";
import type { Service } from "../../models/service";
import { categoryService } from "../../services/categoryService";
import { providerService } from "../../services/providerService";
import { serviceCatalogService } from "../../services/serviceCatalogService";
import { resolveImageUrl } from "../../utils/media";

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function LocationPinIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  );
}

function StorefrontIcon() {
  return (
    <svg {...iconProps} width={40} height={40}>
      <path d="M4 9.5 5.2 4h13.6l1.2 5.5" />
      <path d="M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
      <path d="M5.5 11v9h13v-9" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

type SortOption = "name" | "price-asc" | "price-desc" | "duration";

const sortLabels: Record<SortOption, string> = {
  name: "Naziv (A-Š)",
  "price-asc": "Cena - rastuće",
  "price-desc": "Cena - opadajuće",
  duration: "Trajanje",
};

export function ServicesPage() {
  useDocumentTitle("Usluge");

  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      serviceCatalogService.getAllPublic(controller.signal),
      providerService.getAll(controller.signal),
      categoryService.getAll(controller.signal),
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

  const visibleServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let result = services;

    if (selectedCategoryId) {
      result = result.filter((service) => service.categoryId === selectedCategoryId);
    }

    if (query) {
      result = result.filter((service) => {
        const provider = providersById.get(service.providerId);
        return (
          service.name.toLowerCase().includes(query) ||
          (provider?.name.toLowerCase().includes(query) ?? false) ||
          (provider?.address?.toLowerCase().includes(query) ?? false)
        );
      });
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "duration":
          return a.durationMinutes - b.durationMinutes;
        default:
          return a.name.localeCompare(b.name, "sr");
      }
    });
  }, [services, providersById, selectedCategoryId, searchQuery, sortBy]);

  if (status === "loading") {
    return <div className="loading-spinner" />;
  }

  if (status === "error") {
    return (
      <div className="empty-state">
        <p>Trenutno ne možemo da učitamo usluge. Pokušaj ponovo malo kasnije.</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Chronos" title="Usluge" description="Pronađi i zakaži uslugu kod pružaoca po tvom izboru." />

      {categories.length > 0 && (
        <div className="category-filter-bar">
          <button
            type="button"
            className={`category-filter-card${selectedCategoryId === null ? " is-selected" : ""}`}
            onClick={() => setSelectedCategoryId(null)}
          >
            <span className="category-icon">
              <StorefrontIcon />
            </span>
            <span className="category-label">Sve</span>
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`category-filter-card${selectedCategoryId === category.id ? " is-selected" : ""}`}
              onClick={() => setSelectedCategoryId(category.id)}
            >
              <span className="category-icon">
                {category.iconUrl ? <img src={category.iconUrl} alt="" width={32} height={32} /> : <StorefrontIcon />}
              </span>
              <span className="category-label">{category.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="services-toolbar">
        <input
          type="search"
          className="services-search-input"
          placeholder="Pretraži po nazivu usluge, pružaocu ili lokaciji..."
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
          <p>Nema usluga koje odgovaraju izabranim filterima.</p>
        </div>
      ) : (
        <div className="card-grid services-grid">
          {visibleServices.map((service) => {
            const provider = providersById.get(service.providerId);
            const category = categoriesById.get(service.categoryId);
            return (
              <a key={service.id} className="card marketplace-card" href={routes.serviceDetail(service.id)}>
                <div className="marketplace-card-media">
                  {service.imageUrl ? (
                    <img src={resolveImageUrl(service.imageUrl)} alt={service.name} />
                  ) : (
                    <div className="provider-card-placeholder">
                      <StorefrontIcon />
                    </div>
                  )}
                </div>
                <div className="marketplace-card-columns">
                  <div className="marketplace-card-service">
                    <div className="service-manage-category">
                      {category?.iconUrl && <img src={category.iconUrl} alt="" className="service-category-icon" />}
                      <p className="eyebrow">{category?.name ?? "Bez kategorije"}</p>
                    </div>
                    <h3>{service.name}</h3>
                    {service.description && <p>{service.description}</p>}
                    <p className="service-manage-meta">
                      {service.durationMinutes} min · {service.price} RSD
                    </p>
                  </div>
                  {provider && (
                    <div className="marketplace-card-provider">
                      <p className="marketplace-service-provider-name">{provider.name}</p>
                      {provider.address && (
                        <p className="provider-card-location">
                          <LocationPinIcon />
                          {provider.address}
                        </p>
                      )}
                      {provider.contactPhone && (
                        <p className="marketplace-service-provider-phone">{provider.contactPhone}</p>
                      )}
                    </div>
                  )}
                </div>
                <span className="button button--primary marketplace-card-cta">Zakaži</span>
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}
