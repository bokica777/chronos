import { routes } from "../../../app/router/routes";
import type { Provider } from "../../../models/provider";
import { resolveImageUrl } from "../../../utils/media";

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function LocationPinIcon() {
  return (
    <svg {...iconProps} width={16} height={16}>
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

export function ProviderCard({ provider }: { provider: Provider }) {
  return (
    <a className="card provider-card" href={routes.providerDetail(provider.id)}>
      <div className="provider-card-media">
        {provider.imageUrl ? (
          <img src={resolveImageUrl(provider.imageUrl)} alt={provider.name} />
        ) : (
          <div className="provider-card-placeholder">
            <StorefrontIcon />
          </div>
        )}
      </div>
      <div className="provider-card-body">
        <p className="eyebrow">Pružalac usluge</p>
        <h2>{provider.name}</h2>
        <p>{provider.description ?? "Opis će uskoro biti dostupan."}</p>
        {provider.address && (
          <p className="provider-card-location">
            <LocationPinIcon />
            {provider.address}
          </p>
        )}
      </div>
    </a>
  );
}
