import { useEffect, useState } from "react";
import { routes } from "../../app/router/routes";
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
    <svg {...iconProps} width={40} height={40}>
      <path d="M4 9.5 5.2 4h13.6l1.2 5.5" />
      <path d="M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
      <path d="M5.5 11v9h13v-9" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

type Status = "loading" | "error" | "not-found" | "ready";

export function ServiceDetailPage({ serviceId }: { serviceId: string }) {
  const [service, setService] = useState<Service | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useDocumentTitle(service ? service.name : "Usluga");

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      serviceCatalogService.getPublicById(serviceId, controller.signal),
      categoryService.getAll(controller.signal),
    ])
      .then(async ([serviceResult, categoriesResult]) => {
        const providerResult = await providerService.getById(serviceResult.providerId, controller.signal);
        setService(serviceResult);
        setProvider(providerResult);
        setCategory(categoriesResult.find((item) => item.id === serviceResult.categoryId) ?? null);
        setStatus("ready");
      })
      .catch((error: ApiProblem) => {
        if (controller.signal.aborted) {
          return;
        }
        setStatus(error.status === 404 ? "not-found" : "error");
      });

    return () => controller.abort();
  }, [serviceId]);

  if (status === "loading") {
    return <div className="loading-spinner" />;
  }

  if (status === "not-found") {
    return (
      <div className="empty-state">
        <p>Usluga nije pronađena.</p>
      </div>
    );
  }

  if (status === "error" || !service || !provider) {
    return (
      <div className="empty-state">
        <p>Trenutno ne možemo da učitamo ovu uslugu. Pokušaj ponovo malo kasnije.</p>
      </div>
    );
  }

  const hasLocation = typeof provider.latitude === "number" && typeof provider.longitude === "number";

  return (
    <div className="provider-detail-grid">
      <div className="card service-detail-card">
        <p className="eyebrow">{category?.name ?? "Usluga"}</p>
        <h1>{service.name}</h1>

        <div className="service-detail-media-row">
          <div className="service-detail-media">
            {service.imageUrl ? (
              <img src={resolveImageUrl(service.imageUrl)} alt={service.name} />
            ) : (
              <div className="provider-card-placeholder">
                <StorefrontIcon />
              </div>
            )}
          </div>
          <div className="service-detail-quickfacts">
            <div className="profile-view-field">
              <h3>Cena</h3>
              <p>{service.price} RSD</p>
            </div>
            <div className="profile-view-field">
              <h3>Trajanje</h3>
              <p>{service.durationMinutes} min</p>
            </div>
          </div>
        </div>

        <div className="service-detail-notes">
          {service.description && (
            <div className="profile-view-field">
              <h3>Opis</h3>
              <p>{service.description}</p>
            </div>
          )}
          {service.note && (
            <div className="profile-view-field">
              <h3>Napomena</h3>
              <p>{service.note}</p>
            </div>
          )}
        </div>

        <div className="service-detail-booking">
          <h3>Zakaži termin</h3>
          <BookingForm
            service={service}
            providerId={provider.id}
            workingHoursStart={provider.workingHoursStart}
            workingHoursEnd={provider.workingHoursEnd}
          />
        </div>
      </div>

      <div className="card provider-detail-panel">
        <h3>Partner</h3>

        {hasLocation && (
          <LeafletMap latitude={provider.latitude!} longitude={provider.longitude!} label={provider.name} />
        )}

        <div className="partner-info-grid">
          <div className="partner-info-item">
            <span className="partner-info-label">Naziv</span>
            <span className="partner-info-value">{provider.name}</span>
          </div>
          {provider.address && (
            <div className="partner-info-item">
              <span className="partner-info-label">Adresa</span>
              <span className="partner-info-value">
                <LocationPinIcon />
                {provider.address}
              </span>
            </div>
          )}
          {provider.contactPhone && (
            <div className="partner-info-item">
              <span className="partner-info-label">Telefon</span>
              <span className="partner-info-value">{provider.contactPhone}</span>
            </div>
          )}
          {provider.contactEmail && (
            <div className="partner-info-item">
              <span className="partner-info-label">Email</span>
              <span className="partner-info-value">{provider.contactEmail}</span>
            </div>
          )}
        </div>

        <div className="hero-actions provider-detail-actions">
          <a className="button button--secondary" href={routes.providerDetail(provider.id)}>
            Sve usluge partnera
          </a>
        </div>
      </div>
    </div>
  );
}
