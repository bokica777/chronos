package rs.ftn.booking_service.domain.loyalty;

// Kartica lojalnosti kupca - najjednostavnija verzija, bez posebne tabele:
// sve se racuna iz postojecih rezervacija.
//
// Pravila:
//  - 1 pecat = 1 realizovana poseta (rezervacija koja NIJE otkazana i ciji je
//    termin vec prosao - buduce rezervacije se ne racunaju, da se popust ne bi
//    "zaradio" pravljenjem pa otkazivanjem rezervacija);
//  - Bronzani nivo: 0-4 pecata, bez popusta;
//  - Srebrni nivo: 5-9 pecata, 5% popusta;
//  - Zlatni nivo: 10+ pecata, 10% popusta.
// Popust se automatski primenjuje na cenu svake nove rezervacije.
public record LoyaltyStatus(
        int stamps,
        String level,
        int discountPercent,
        Integer nextLevelAt,
        String nextLevel
) {
    public static final int SILVER_AT = 5;
    public static final int GOLD_AT = 10;

    public static LoyaltyStatus forStamps(int stamps) {
        if (stamps >= GOLD_AT) {
            return new LoyaltyStatus(stamps, "Zlatni", 10, null, null);
        }
        if (stamps >= SILVER_AT) {
            return new LoyaltyStatus(stamps, "Srebrni", 5, GOLD_AT, "Zlatni");
        }
        return new LoyaltyStatus(stamps, "Bronzani", 0, SILVER_AT, "Srebrni");
    }

    public double applyDiscount(double price) {
        return Math.round(price * (100 - discountPercent)) / 100.0;
    }
}
