# Chronos — status projekta naspram specifikacije

Datum: 22.08.2026.

Ovaj dokument poredi stvarno stanje implementacije sa `Spec/Specifikacija_sistema.docx`. Legenda: ✅ gotovo, 🟡 delimično, ⛔ nije početo.

## 1. Opšta slika

Specifikacija predviđa 6 mikroservisa: Auth, Provider, Booking, Payment, **Notification** i implicitno API Gateway kao ulaznu tačku. Od toga:

- ✅ Auth, Provider, Booking, Payment, **Notification** — svih pet postoji, rade, imaju sopstvenu bazu, i međusobno su razdvojeni (database-per-service je ispoštovan tačno onako kako spec traži — nema cross-service pristupa bazi).
- ✅ API Gateway (YARP) — rutira ka svih pet servisa.
- ✅ **Notification servis — sada postoji.** Java/Spring Boot servis koji sluša `notification.booking-events` queue (`booking.*` routing key na `booking.events` exchange-u), obrađuje `booking.created`/`booking.cancelled` evente koje booking-service već objavljuje kroz outbox, i beleži ih u sopstvenu bazu (`NotificationDb`). Slanje je za sada simulirano (loguje se, nema pravog SMTP naloga) kroz zamenjiv `NotificationSender` interfejs — arhitektonski spreman za pravi email provajder kasnije. Admin panel ima nov tab "Obaveštenja" koji to i pokazuje.

Funkcionalno, aplikacija radi end-to-end: registracija/login sa ulogama (Client/Partner/Admin), partner kreira profil i usluge sa slikama i lokacijom na mapi, klijent pretražuje, zakazuje termin, JWT osigurava da ne može da zakazuje u tuđe ime, a sada postoji i admin panel za moderaciju korisnika, kategorija, provajdera, usluga, pregled svih rezervacija, obaveštenja i plaćanja.

Payment servis je sada povezan sa tokom rezervacije (frontend orkestrira - nema sinhronog REST poziva iz booking-service ka payment-service): posle rezervacije korisnik na stranici "Moje rezervacije" pokreće plaćanje. Payment servis je dobio i JWT zaštitu (ranije nije imao nikakvu) i admin-only pregled svih uplata.

**Plaćanje je od ovog koraka pravi Stripe Checkout (test mod/sandbox), ne više čista simulacija.** Klik pokreće Stripe Checkout sesiju (Stripe.net SDK), korisnik se prebacuje na pravu Stripe stranicu i unosi standardni test broj kartice (`4242 4242 4242 4242`), pa se vraća na `/bookings` gde se plaćanje potvrđuje - i odmah pri povratku (`confirm-stripe` ruta) i nezavisno preko Stripe webhook-a (`webhooks/stripe`, potpis se proverava HMAC-om). Naplata ide u EUR po fiksnom kursu (RSD ima poznatu nedoslednost oko decimala kod Stripe-a) - ostatak aplikacije i dalje prikazuje cene u RSD. Detaljno objašnjeno u `docs/payment-flow-notes.md`, uključujući uputstvo za lokalno testiranje webhook-a preko Stripe CLI-a.

Ono što specifikacija identifikuje kao **suštinu diplomskog rada — Docker, Kubernetes, Argo Rollouts, CI/CD, observability, v1/v2 canary rollout — trenutno je na 0%.** Cela funkcionalna aplikacija je gotova, ali deo koji dokazuje temu diplomskog rada (progresivni rollout) tek treba da počne.

## 2. Deo I — infrastruktura i DevOps (Faze 4–5 iz specifikacije)

| Oblast | Status | Napomena |
|---|---|---|
| Kontejnerizacija (Dockerfile po servisu) | ⛔ | Nijedan servis nema Dockerfile |
| Kubernetes manifesti | ⛔ | Nema deployment/service/ingress YAML-ova |
| Argo Rollouts (canary) | ⛔ | Ovo je centralna tema rada — još ne postoji |
| CI/CD pipeline | ⛔ | Nema build/test/deploy automatizacije |
| Observability (Prometheus/Grafana, metrike) | ⛔ | Nijedan servis ne izlaže metrike |
| v1/v2 verzionisanje Booking servisa | ⛔ | Postoji samo jedna verzija Booking servisa, nema razdvajanja na v1/v2 koje je potrebno da bi canary rollout imao smisla |

Ovo je najveći gap. Sve ostalo (Faze 0–3: skelet, CRUD, RabbitMQ eventi, poslovna logika) je urađeno solidno, ali bez ovog dela ne postoji demonstracija progresivnog rollouta — a to je tema diplomskog rada.

## 3. Deo II — Booking mikroservis (detaljna specifikacija)

Specifikacija posvećuje Booking servisu poseban odeljak jer je on centralna tačka demonstracije. Provera po tačkama:

- **11.1 Odgovornosti** — ✅ kreiranje, otkazivanje, pregled rezervacija su tu; provera preklapanja termina rešena je pesimističkim zaključavanjem (`PESSIMISTIC_WRITE`), tačno kao što spec preporučuje za O2.
- **11.3 Domenski model** — ✅ `Booking` entitet odgovara specifikaciji (customerId, providerId, serviceId, startTime, status, price).
- **11.4 REST API** — 🟡 postoje endpoint-i za kreiranje, otkazivanje, `/me`, listu po provajderu i admin listu. Ono što spec predviđa a ne postoji: Booking servis **nikada ne zove Provider servis preko REST-a** da proveri da li usluga/provajder zaista postoji i da li je aktivan pre zakazivanja — trenutno se to oslanja samo na podatke poslate sa fronta.
- **11.5 RabbitMQ eventi** — ✅ outbox šablon je implementiran tačno po preporučenoj opciji A (upis eventa u istoj transakciji, poseban publisher na 2s), i sada **postoji konzument** — Notification servis sluša oba routing key-a i obrađuje ih. (Payment servis i dalje ne sluša Booking evente niti obrnuto — to nije bilo u obimu ovog koraka.)
- **11.6 v1/v2 razlika** — ⛔ nije početo, a ovo je preduslov za canary demo.
- **11.7 Metrike** — ⛔ nema Micrometer/Prometheus instrumentacije.
- **11.8 Bezbednost** — 🟡 spec predviđa JWKS/asimetričnu validaciju; stvarna implementacija koristi deljeni HMAC ključ (simetrični, hardkodovan u `application.properties`/`appsettings`). Funkcionalno ekvivalentno za potrebe rada, ali odstupanje od specifikacije vredno pomena u odbrani.

## 4. Otvorene odluke (O1–O8) — rezultat

Specifikacija je ostavila 8 otvorenih arhitektonskih odluka sa preporučenim opcijama. Trenutno stanje:

- ✅ O2 (konkurentno zakazivanje) — rešeno pesimističkim zaključavanjem, po preporuci.
- ✅ Event publishing (outbox) — rešeno transakcionim outbox šablonom, po preporuci opcije A.
- ✅ Autentikacija po servisu — svaki servis nezavisno validira JWT (deljeni ključ), u duhu preporuke, samo simetrično umesto asimetrično. (Payment servis ovo do sada nije imao uopšte - dodato u ovom koraku zajedno sa povezivanjem na tok rezervacije.)
- ✅ Database-per-service — potpuno ispoštovano.
- ✅ Soft delete umesto hard delete — dosledno primenjeno na sve entitete (Category, ProviderProfile, Service, User) baš zbog cross-service referenci koje bi ostale "viseće" pri fizičkom brisanju.
- ⛔ Preostale odluke vezane za deployment/rollout (verzionisanje, routing između v1/v2, metrika za odlučivanje o promociji rollouta) — nisu ni mogle biti rešene jer im prethodi Docker/K8s deo koji još ne postoji.

## 5. Šta ovo znači za dalje

Funkcionalna aplikacija (Faze 0–3) je čvrsta i u velikoj meri prati specifikaciju, sa par svesnih i objašnjivih odstupanja (simetrični JWT, nema Provider→Booking REST provere). To je dobra osnova za odbranu — pokazuje da je poslovna logika rešena kompetentno, uključujući sada i ceo asinhroni lanac (outbox → RabbitMQ → Notification konzument) koji je ranije bio samo napola urađen.

Ono što nedostaje da bi rad bio kompletan po sopstvenoj specifikaciji je tačno ono što spec naziva "srž rada": Docker slike, K8s manifesti, Argo Rollouts canary, v1/v2 razdvajanje Booking servisa i osnovna observability priča koja pokazuje *zašto* je canary bolji od običnog rollinga. Preporuka: sledeći koraci treba da idu tim redom — prvo Dockerfile + v1/v2 razdvajanje Booking servisa (preduslov za sve ostalo), zatim K8s manifesti, pa Argo Rollouts, na kraju metrike/observability koje daju rollout-u signal za promociju/rollback.

Sitniji, ne-blokirajući gapovi vredni beleženja: `/api/v1/bookings/provider/{id}` je javan endpoint i vraća `customerId` (PII curenje), nema paginacije nigde u sistemu, ne postoji nijedan unit/integration test, i deljena `.NET` `IEventPublisher` infrastruktura (`building-blocks/Messaging`, koju koriste auth/provider/payment) i dalje ima samo `DevelopmentEventPublisher` koji loguje događaje umesto da ih stvarno šalje na RabbitMQ - `PaymentCompleted` event se, iako je već programiran da se objavljuje pri završetku uplate, trenutno gubi u logu. Pravi RabbitMQ adapter za ovu granu (za razliku od Java booking-service koji ga već ima) ostaje otvoren posao.
