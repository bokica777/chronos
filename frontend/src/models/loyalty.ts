// Kartica lojalnosti - racuna je booking-service iz realizovanih poseta.
export interface LoyaltyStatus {
  stamps: number;
  level: string;
  discountPercent: number;
  nextLevelAt: number | null;
  nextLevel: string | null;
}
