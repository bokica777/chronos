# Backend

```text
backend/
├── gateway/Gateway/
├── building-blocks/
│   ├── Contracts/
│   ├── Messaging/
│   └── Observability/
└── services/
    ├── auth-service/AuthService.csproj
    ├── provider-service/ProviderService.csproj
    ├── booking-service/BookingService.csproj
    ├── payment-service/PaymentService.csproj
    └── notification-service/
```

Svaki .NET mikroservis je jedan deployable projekat. Unutar projekta koristi kratke
foldere:

```text
booking-service/
├── BookingService.csproj
├── Api/             HTTP, middleware i composition root
├── Application/     use-case servisi i apstrakcije
├── Domain/          entiteti i poslovna pravila
├── Infrastructure/  EF Core, migracije, messaging i spoljne integracije
└── Contracts/       javni HTTP i event ugovori
```

Ovi folderi nisu zasebni projekti. Arhitektonske granice održavaju se konvencijama,
namespace-ovima, interfejsima i testovima.

## Komunikacija

- React poziva samo Gateway.
- Gateway prosleđuje HTTP zahteve odgovarajućem internom API-ju.
- Mikroservisi objavljuju integration event-e preko `IEventPublisher`.
- `DevelopmentEventPublisher` trenutno samo zapisuje događaj u log.
- RabbitMQ adapter i outbox processor biće uvedeni kada definišemo broker topologiju.

## Build

Iz korena `Chronos` foldera:

```powershell
dotnet restore Chronos.sln
dotnet build Chronos.sln
```

Solution cilja .NET 8, dok `global.json` bira instalirani .NET 10 SDK koji može da ga
izgradi. Verzije NuGet paketa nalaze se centralno u `Directory.Packages.props`.

`building-blocks` sadrži deljeni tehnički source koji se uključuje u svaki servis
tokom build-a, ali nema svoj `.csproj`. Domenski entiteti se nikada ne dele između
servisa.
