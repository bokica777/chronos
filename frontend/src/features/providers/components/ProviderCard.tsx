import { Card } from "../../../components/common/Card";
import type { Provider } from "../../../models/provider";

export function ProviderCard({ provider }: { provider: Provider }) {
  return (
    <Card>
      <p className="eyebrow">Pružalac usluge</p>
      <h2>{provider.name}</h2>
      <p>{provider.description ?? "Opis će uskoro biti dostupan."}</p>
      <a href={`/providers/${provider.id}`}>Pogledaj termine</a>
    </Card>
  );
}
