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

Razdvojene su četiri vrste verzija:

1. API ugovor, na primer `/api/v1/bookings` i `/api/v2/bookings`;
2. Docker image, na primer `booking-api:1.0.0`;
3. integration event schema version;
4. EF Core migracije baze.

Booking API već ima v1 i v2 ulazne tačke. V2 dodaje proveru preklapanja, dok oba toka
koriste isti domen i persistence sloj. Deployment verzije će kasnije biti odvojeni
image tag-ovi koje Argo Rollouts postepeno promoviše.

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
