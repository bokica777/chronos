# Docker: ceo Chronos sistem u kontejnerima

`compose.yaml` pokreće:

- infrastrukturu: SQL Server, RabbitMQ i jednokratni `sqlserver-init` koji pravi baze;
- sve servise: auth, provider, payment, booking, notification, gateway i frontend.

## Prvo pokretanje

Komande se pokreću iz korena repozitorijuma (folder `Chronos`).

1. (Opciono) Kopiraj `infra/docker/.env.example` u `infra/docker/.env` i popuni ga:
   - `NOTIFICATIONS_EMAIL_ENABLED=true` i `SMTP_*` (Gmail App Password) ako želiš prave mejlove;
   - `CHRONOS_HOST=<IP računara>` ako QR kod treba da radi sa telefona.

   Bez `.env` sve radi, samo su mejlovi isključeni, a linkovi vode na `localhost`.
2. Build i pokretanje:
   ```
   docker compose -f infra/docker/compose.yaml --profile full up -d --build
   ```
   Prvi build traje nekoliko minuta, jer se preuzimaju .NET, Maven i npm zavisnosti.
3. Otvori:

| Šta | Adresa |
|---|---|
| Aplikacija (frontend) | http://localhost:5173 |
| API Gateway | http://localhost:5076 |
| RabbitMQ panel | http://localhost:15672 (`chronos` / `Chronos!2026`) |
| SQL Server | `localhost,1433` (`sa` / `Chronos!2026`) |

## Česte komande

```
# stanje kontejnera
docker compose -f infra/docker/compose.yaml --profile full ps

# log jednog servisa (npr. provera mejlova)
docker compose -f infra/docker/compose.yaml logs -f notification-api

# posle izmene koda: rebuild samo tog servisa
docker compose -f infra/docker/compose.yaml --profile full up -d --build booking-api

# gašenje (podaci ostaju u volume-ima)
docker compose -f infra/docker/compose.yaml --profile full down

# gašenje + brisanje SVIH podataka (baze, slike)
docker compose -f infra/docker/compose.yaml --profile full down -v
```

## Napomene

- **Lokalni razvoj i Docker se ne pokreću istovremeno**, jer koriste iste portove.
  `run-local.ps1` diže samo infrastrukturu (bez `--profile full`), a servise pokreće
  lokalno.
- Frontend adrese (`VITE_API_BASE_URL`, `VITE_PUBLIC_APP_URL`) upisuju se u JS pri
  **build-u**. Posle promene `CHRONOS_HOST` pokreni ponovo `up -d --build frontend`.
- Otpremljene slike partnera, usluga i korisnika čuvaju se u volume-ima
  `provider-uploads` i `auth-uploads`, pa prežive rebuild.
- Kontejneri imaju `restart: unless-stopped`: sami se dignu posle restarta Docker-a
  ili ako servis padne pri startu (npr. dok SQL Server još nije spreman).
