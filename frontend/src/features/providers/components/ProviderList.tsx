import type { Provider } from "../../../models/provider";
import { ProviderCard } from "./ProviderCard";

export function ProviderList({ providers }: { providers: Provider[] }) {
  return (
    <section className="card-grid">
      {providers.map((provider) => (
        <ProviderCard key={provider.id} provider={provider} />
      ))}
    </section>
  );
}
