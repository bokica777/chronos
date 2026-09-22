# Vodič kroz verzionisanje u Chronos-u

Ovaj dokument objašnjava OBA mehanizma verzionisanja koja postoje u projektu,
zašto su namerno različita (vidi ADR-012 u `docs/decisions/README.md`), i —
najvažnije — kako se u praksi prebacuje sa jedne verzije na drugu i kako se
proverava koja verzija trenutno radi.

## Pregled: dva različita pitanja

| | Booking-service (v1 / v2 / v3) | Provider-service (v1 / v2) |
|---|---|---|
| Pitanje na koje odgovara | "Koja *instanca* servisa trenutno opslužuje saobraćaj?" | "Koji *oblik ugovora* klijent dobija?" |
| Mehanizam | Jedan Docker image, ponašanje se menja preko `BOOKING_VERSION` env promenljive u trenutku pokretanja kontejnera | Dve paralelne URL putanje (`/api/v1/...` i `/api/v2/...`) unutar istog pokrenutog servisa |
| Ko bira verziju | Operater/DevOps (koji manifest je primenjen) | Klijent (koju putanju pozove) |
| Tipičan slučaj upotrebe | Postepeni (canary) prelazak na novo ponašanje uz automatski rollback ako nešto pukne | Stariji klijent nastavlja da radi na v1 dok se novi klijenti prebacuju na v2 |
| Gde se vidi u kodu | `BookingServiceImpl.createBooking`, `ProviderServiceClient` (booking-service) | `PublicServicesController` vs `PublicServicesV2Controller` (provider-service) |

Oba su legitimna, uobičajena značenja pojma "verzionisanje mikroservisa" — u
ovom radu su namerno oba demonstrirana, na dva različita servisa, da bi
razlika bila jasno vidljiva.

---

## Deo 1: Booking-service — deployment/rollout verzionisanje (v1 → v2 → v3)

### Šta se stvarno menja između verzija

Sve tri verzije su **isti kod, ista URL putanja** (`/api/v1/bookings`, bez
promene!) — razlika je isključivo u tome koje provere `createBooking(...)`
izvršava pre nego što sačuva rezervaciju:

- **v1** — bez ikakve provere prema provider-service-u. Prihvata rezervaciju i
  za nepostojećeg provajdera/uslugu (poznat, namerno demonstriran nedostatak).
- **v2** — dodaje proveru da `providerId` i `serviceId` postoje, da su aktivni
  i da usluga zaista pripada tom provajderu (`ProviderServiceClient.assertProviderAndServiceAreBookable`,
  sinhroni HTTP poziv ka provider-service-u). Ako provera ne prođe → HTTP 400.
- **v3** — sve iz v2, plus provera da traženo vreme rezervacije upada u
  radno vreme provajdera (`ProviderServiceClient.assertWithinWorkingHours`).
  Ova provera je do sada postojala SAMO na frontu (`BookingForm`) — v3 je
  prvi put da se ista pravila primenjuju i na serveru, gde ih korisnik ne može
  zaobići direktnim pozivom API-ja.

Kod: `backend/services/booking-service/src/main/java/rs/ftn/booking_service/application/services/BookingServiceImpl.java`,
`backend/services/booking-service/src/main/java/rs/ftn/booking_service/infrastructure/http/ProviderServiceClient.java`.

### Kako se prebacuje verzija

**Lokalno (IntelliJ/Maven, bez Dockera):**

```
BOOKING_VERSION=v3 mvn spring-boot:run
```
ili u IntelliJ Run Configuration → Environment variables → `BOOKING_VERSION=v3`.
Bez ove promenljive, podrazumevano je `v1` (`application.properties`).

**Docker Compose:**

```
BOOKING_VERSION=v3 docker compose --profile full up booking-api
```
Podrazumevano (bez promenljive) je `v1` — vidi `infra/docker/compose.yaml:179`.

**Kubernetes (kind + Argo Rollouts) — glavni demo scenario:**

Postoje tri gotova manifesta, po jedan za svaku verziju, koji svi ciljaju
ISTI `Rollout` resurs (`booking-api`):

```bash
# Trenutno stabilno stanje ostaje kakvo jeste; primena novog manifesta
# pokreće canary prelazak (10% -> analiza -> 50% -> analiza -> 100%):
kubectl apply -f infra/argo-rollouts/rollout-booking.yaml     # v1
kubectl apply -f infra/argo-rollouts/rollout-booking-v2.yaml  # v2
kubectl apply -f infra/argo-rollouts/rollout-booking-v3.yaml  # v3

# Praćenje uživo dok Argo Rollouts postepeno povećava saobraćaj ka novoj verziji:
kubectl argo rollouts get rollout booking-api -n chronos --watch

# Ručna promocija na sledeći korak (ako se ne čeka automatska analiza):
kubectl argo rollouts promote booking-api -n chronos

# Povratak na prethodnu verziju u bilo kom trenutku:
kubectl apply -f infra/argo-rollouts/rollout-booking.yaml     # nazad na v1
```

Kompletan scenario sa simuliranim kvarom i automatskim rollback-om:
`infra/scripts/demo-rollback-scenario.md`.

### Kako da se proveri koja verzija trenutno odgovara

Svaki odgovor booking-service-a nosi header `X-Booking-Service-Version`
(postavlja `VersionHeaderFilter`, čita istu `BOOKING_VERSION` promenljivu):

```bash
curl -i http://localhost:8080/api/v1/bookings/me -H "Authorization: Bearer <token>" | grep X-Booking-Service-Version
```

Kroz gateway (lokalno ili u klasteru), isti header prolazi neizmenjen:

```bash
curl -i http://chronos.local/api/v1/bookings/me -H "Authorization: Bearer <token>" | grep X-Booking-Service-Version
```

U klasteru, dodatno se može videti direktno stanje rollout-a (koliko replika
kog "revision"-a trenutno postoji):

```bash
kubectl argo rollouts get rollout booking-api -n chronos
kubectl get pods -n chronos -l app=booking-api -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].env[?(@.name=="BOOKING_VERSION")].value}{"\n"}{end}'
```

**Funkcionalna provera da v2/v3 stvarno rade drugačije od v1** (dobra "wow"
demonstracija na odbrani): pošalji `POST /api/v1/bookings` sa nepostojećim
`providerId` — na v1 rezervacija uspeva (200/201), na v2 i v3 vraća 400.
Zatim pošalji rezervaciju van radnog vremena provajdera — na v1/v2 uspeva, na
v3 vraća 400.

---

## Deo 2: Provider-service — API/ugovor verzionisanje preko URL putanje (v1 vs v2)

### Šta se stvarno menja između verzija

Za razliku od booking-service-a, ovde nema env promenljive niti više instanci
— **jedan pokrenut provider-service istovremeno opslužuje obe putanje**:

- `GET /api/v1/services` i `GET /api/v1/services/{id}` (`PublicServicesController`)
  — vraćaju `ServiceResponse`: `categoryId` kao goli GUID, klijent mora
  posebno da povuče naziv kategorije/provajdera ako mu treba za prikaz.
- `GET /api/v2/services` i `GET /api/v2/services/{id}` (`PublicServicesV2Controller`)
  — vraćaju `ServiceResponseV2`: isti podaci PLUS `providerName` i
  `categoryName` već ugrađeni u odgovor, bez dodatnih poziva.

Frontend aplikacije i dalje koristi v1 (nema razloga za migraciju u okviru
ovog rada) — v2 postoji da demonstrira mehanizam i stvarnu razliku u ugovoru,
ne da zameni v1.

Kod: `backend/services/provider-service/Api/PublicServicesController.cs`,
`backend/services/provider-service/Api/PublicServicesV2Controller.cs`,
`backend/services/provider-service/Contracts/ServiceContracts.cs`
(`ServiceResponse` vs `ServiceResponseV2`).

### Kako se poziva svaka verzija

Obe putanje su uvek dostupne u isto vreme (nema "prebacivanja" — to je i
poenta ugovor-verzionisanja, za razliku od deployment-verzionisanja iznad):

```bash
# v1 - "sirov" oblik
curl http://localhost:5000/api/v1/services | jq '.[0]'
# {
#   "id": "...",
#   "providerId": "...",
#   "categoryId": "...",
#   "name": "Šišanje",
#   ...
# }

# v2 - obogaćen oblik
curl http://localhost:5000/api/v2/services | jq '.[0]'
# {
#   "id": "...",
#   "providerId": "...",
#   "providerName": "Bejba Barbershop",
#   "categoryId": "...",
#   "categoryName": "Lepota i nega",
#   "name": "Šišanje",
#   ...
# }
```

Kroz gateway (YARP), obe putanje su takođe uvek dostupne:
`backend/gateway/Gateway/appsettings.json` ima posebnu rutu
`public-services-v2-route` za `/api/v2/services/{**catch-all}`, pored
postojeće `public-services-route` za v1 — obe gađaju isti `provider-cluster`.

### Kako se proverava koja verzija je "trenutno aktivna"

Ovde nema smisla pitati "koja verzija radi" kao kod booking-service-a — obe
uvek rade istovremeno u istom pokrenutom servisu. Ono što se proverava je
koju putanju konkretan klijent poziva: pogledaj URL u `frontend/src/services/*.ts`
poziva (`/api/v1/services`) da vidiš da frontend danas koristi v1; promena na
v2 bi bila obična izmena putanje + prilagođavanje frontend modela novim
poljima, bez ikakve promene na backend-u.
