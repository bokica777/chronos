package rs.ftn.booking_service.domain.loyalty;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoyaltyStatusTest {

    @Test
    void forStamps_belowSilver_isBronzeWithoutDiscount() {
        LoyaltyStatus status = LoyaltyStatus.forStamps(4);

        assertThat(status.level()).isEqualTo("Bronzani");
        assertThat(status.discountPercent()).isZero();
        assertThat(status.nextLevelAt()).isEqualTo(5);
        assertThat(status.applyDiscount(1000)).isEqualTo(1000);
    }

    @Test
    void forStamps_fiveStamps_isSilverWithFivePercent() {
        LoyaltyStatus status = LoyaltyStatus.forStamps(5);

        assertThat(status.level()).isEqualTo("Srebrni");
        assertThat(status.discountPercent()).isEqualTo(5);
        assertThat(status.applyDiscount(1000)).isEqualTo(950);
    }

    @Test
    void forStamps_tenStamps_isGoldWithTenPercentAndNoNextLevel() {
        LoyaltyStatus status = LoyaltyStatus.forStamps(12);

        assertThat(status.level()).isEqualTo("Zlatni");
        assertThat(status.discountPercent()).isEqualTo(10);
        assertThat(status.nextLevelAt()).isNull();
        assertThat(status.applyDiscount(1499.99)).isEqualTo(1349.99);
    }
}
