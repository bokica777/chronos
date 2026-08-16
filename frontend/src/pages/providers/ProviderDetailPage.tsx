import { useEffect, useState } from "react";
import { LeafletMap } from "../../components/common/LeafletMap";
import { BookingForm } from "../../features/bookings/components/BookingForm";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import type { ApiProblem } from "../../models/api";
import type { Category } from "../../models/category";
import type { Provider } from "../../models/provider";
import type { Service } from "../../models/service";
import { categoryService } from "../../services/categoryService";
import { providerService } from "../../services/providerService";
import { serviceCatalogService } from "../../services/serviceCatalogService";
import { resolveImageUrl } from "../../utils/media";

const iconProps = {
  width: 18,
  height: 18,
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
    <svg {...iconProps} width={56} height={56}>
      <path d="M4 9.5 5.2 4h13.6l1.2 5.5" />
      <path d="M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
      <path d="M5.5 11v9h13v-9" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

type Status = "loading" | "error" | "not-found" | "ready";

export function ProviderDetailPage({ providerId }: { providerId: string }) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  useDocumentTitle(provider ? provider.name : "Pružalac usluge");

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      providerService.getById(providerId, controller.signal),
      serviceCatalogService.getByProvider(providerId, controller.signal),
      categoryService.getAll(controller.signal),
    ])
      .then(([providerResult, servicesResult, categoriesResult]) => {
        setProvider(providerResult);
        setServices(servicesResult);
        setCategories(categoriesResult);
        setStatus("ready");
      })
      .catch((error: ApiProblem) => {
        if (controller.signal.aborted) {
          return;
        }
        setStatus(error.status === 404 ? "not-found" : "error");
      });

    return () => controller.abort();
  }, [providerId]);

  if (status === "loading") {
    return <div className="loading-spinner" />;
  }

  if (status === "not-found") {
    return (
      <div className="empty-state">
        <p>Pružalac usluge nije pronađen.</p>
      </div>
    );
  }

  if (status === "error" || !provider) {
    return (
      <div className="empty-state">
        <p>Trenutno ne možemo da učitamo ovu uslugu. Pokušaj ponovo malo kasnije.</p>
      </div>
    );
  }

  const hasLocation = typeof provider.latitude === "number" && typeof provider.longitude === "number";

  return (
    <>
      <div className="provider-detail-grid">
        <div>
          <div className="provider-detail-media">
            {provider.imageUrl ? (
              <img src={resolveImageUrl(provider.imageUrl)} alt={provider.name} />
            ) : (
              <div className="provider-card-placeholder">
                <StorefrontIcon />
              </div>
            )}
          </div>

          <div className="provider-detail-body">
            <p className="eyebrow">Pružalac usluge</p>
            <h1>{provider.name}</h1>
            {provider.address && (
              <p className="provider-detail-location">
                <LocationPinIcon />
                {provider.address}
              </p>
            )}
            <p>{provider.description ?? "Opis će uskoro biti dostupan."}</p>
          </div>
        </div>

        <div className="card provider-detail-panel">
          <h3>Lokacija</h3>
          {hasLocation ? (
            <LeafletMap latitude={provider.latitude!} longitude={provider.longitude!} label={provider.name} />
          ) : (
            <p>Lokacija za ovog pružaoca usluge još nije uneta.</p>
          )}

          <div className="hero-actions provider-detail-actions">
            <a className="button button--primary" href="#usluge">
              Vidi usluge i zakaži
            </a>
          </div>
        </div>
      </div>

      <div className="provider-services-section" id="usluge">
        <h2>Usluge</h2>
        {services.length === 0 ? (
          <p>Ovaj pružalac usluga još uvek nije dodao nijednu uslugu.</p>
        ) : (
          <div className="card-grid">
            {services.map((service) => {
              const category = categories.find((item) => item.id === service.categoryId);
              return (
                <div key={service.id} className="card public-service-card">
                  <div className="public-service-media">
                    {service.imageUrl ? (
                      <img src={resolveImageUrl(service.imageUrl)} alt={service.name} />
                    ) : (
                      <div className="provider-card-placeholder">
                        <StorefrontIcon />
                      </div>
                    )}
                  </div>
                  <div className="public-service-body">
                    <div className="service-manage-category">
                      {category?.iconUrl && <img src={category.iconUrl} alt="" className="service-category-icon" />}
                      <p className="eyebrow">{category?.name ?? "Bez kategorije"}</p>
                    </div>
                    <h3>{service.name}</h3>
                    {service.description && <p>{service.description}</p>}
                    <p className="service-manage-meta">
                      {service.durationMinutes} min · {service.price} RSD
                    </p>
                    <BookingForm
                      service={service}
                      providerId={provider.id}
                      workingHoursStart={provider.workingHoursStart}
                      workingHoursEnd={provider.workingHoursEnd}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
