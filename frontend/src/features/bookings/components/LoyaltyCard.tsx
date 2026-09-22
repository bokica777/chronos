import type { LoyaltyStatus } from "../../../models/loyalty";

// Kartica sa pecatima: jedan pecat = jedna realizovana poseta.
// 5 pecata = Srebrni nivo (5% popusta), 10 pecata = Zlatni nivo (10% popusta).
const CARD_SLOTS = 10;

export function LoyaltyCard({ loyalty }: { loyalty: LoyaltyStatus }) {
  const filled = Math.min(loyalty.stamps, CARD_SLOTS);
  const remaining = loyalty.nextLevelAt !== null ? loyalty.nextLevelAt - loyalty.stamps : 0;
  const levelClass = `loyalty-card--${loyalty.level.toLowerCase()}`;

  return (
    <section className={`card loyalty-card ${levelClass}`} aria-label="Kartica lojalnosti">
      <div className="loyalty-card-header">
        <div>
          <p className="eyebrow">Kartica lojalnosti</p>
          <h3>{loyalty.level} nivo</h3>
        </div>
        <div className="loyalty-card-discount">
          {loyalty.discountPercent > 0 ? `-${loyalty.discountPercent}%` : "0%"}
          <span>popust</span>
        </div>
      </div>

      <div className="loyalty-stamps">
        {Array.from({ length: CARD_SLOTS }, (_, index) => (
          <span
            key={index}
            className={`loyalty-stamp${index < filled ? " is-filled" : ""}${index === 4 || index === 9 ? " is-milestone" : ""}`}
            aria-hidden="true"
          >
            {index < filled ? "✓" : index + 1}
          </span>
        ))}
      </div>

      <p className="loyalty-card-text">
        {loyalty.nextLevel
          ? `Imaš ${loyalty.stamps} ${stampWord(loyalty.stamps)}. Još ${remaining} ${visitWord(remaining)} do nivoa ${loyalty.nextLevel}.`
          : `Imaš ${loyalty.stamps} ${stampWord(loyalty.stamps)} i najviši nivo — 10% popusta na svaku rezervaciju.`}
      </p>
      <p className="loyalty-card-rules">
        Svaka realizovana poseta donosi 1 pečat. 5 pečata = 5% popusta, 10 pečata = 10% popusta. Popust se
        automatski obračunava pri rezervaciji.
      </p>
    </section>
  );
}

// 1 pečat, 2+ pečata (21 pečat, 11 pečata).
function stampWord(count: number): string {
  return count % 10 === 1 && count % 100 !== 11 ? "pečat" : "pečata";
}

function visitWord(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (last === 1 && lastTwo !== 11) return "poseta";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "posete";
  return "poseta";
}
