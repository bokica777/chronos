import { env } from "../config/env";

// Backend cuva otpremljene slike lokalno i vraca relativnu putanju
// (npr. "/uploads/providers/xyz.jpg"). Takva putanja mora da se otvori sa
// Gateway/API hosta, a ne sa frontend hosta - inace browser pokusava da je
// ucita sa npr. localhost:5173 gde slika fizicki ne postoji i dobijamo 404.
export function resolveImageUrl(imageUrl?: string | null): string | undefined {
  if (!imageUrl) {
    return undefined;
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  return `${env.apiBaseUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}
