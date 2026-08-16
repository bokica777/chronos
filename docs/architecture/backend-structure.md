# Backend struktura i pravila

## Ulaz u sistem

Frontend poznaje samo javnu adresu Gateway-a. Adrese mikroservisa su interna
deployment konfiguracija i ne smeju biti ugrađene u React aplikaciju.

## Sinhroni tok

```text
React -> Gateway -> Service/Api -> Application -> Domain
                              |
                              v
                        Infrastructure -> SQL Server
```

Gateway služi za rutiranje, autentifikacione politike, correlation ID, rate limiting
i objedinjavanje OpenAPI dokumentacije. Ne sadrži poslovnu logiku.

Svaki mikroservis ima tačno jedan `.csproj`. `Api`, `Application`, `Domain`,
`Infrastructure` i `Contracts` predstavljaju organizacione foldere unutar tog
projekta, a ne zasebne biblioteke.

## Asinhroni tok

```text
Application -> Outbox -> RabbitMQ -> drugi mikroservis / Notification servis
```

Integration event sadrži `EventId`, vreme nastanka, `CorrelationId` i verziju šeme.
Potrošači moraju biti idempotentni. RabbitMQ adapter tek treba implementirati; do
tada razvojna implementacija beleži objavljene događaje.

## Versioning

Razdvojene su tri vrste verzija:

1. Docker image, na primer `booking-api:1.0.0` i `booking-api:2.0.0`;
2. integration event schema version;
3. EF Core / Flyway migracije baze.

Verzionisanje se ne radi kroz odvojene API rute (`/api/v1`, `/api/v2`) unutar iste
aplikacije, već isključivo kroz Docker image tagove. Endpoint ostaje isti
(`/api/v1/bookings`); novo ponašanje (npr. provera preklapanja u Booking servisu) ide
u novu image verziju (`booking-api:2.0.0`), dok stara verzija (`booking-api:1.0.0`)
ostaje dostupna kao "stable". Argo Rollouts postepeno prebacuje procenat saobraćaja
sa stable na novu verziju na nivou pod-ova/deployment-a, nezavisno od aplikativnog
koda. Ovo izbegava problem gde bi deo pod-ova (stariji) odgovarao 404 na rutu koju
podržavaju samo noviji pod-ovi.

## Observability

Osnova sadrži:

- `X-Correlation-ID` kroz zahtev i odgovor;
- structured logging scope sa correlation ID-em;
- `/health/live` i `/health/ready`;
- `System.Diagnostics.ActivitySource` za tracing;
- request/failure counter i histogram trajanja;
- oznake `service` i `version` na Booking metrikama.

OpenTelemetry i Prometheus exporter biće dodati kao adapteri iznad postojećih
instrumenata kada uvedemo observability infrastrukturu.
