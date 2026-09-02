# Docker kontejnerizacija i Booking v1/v2 — izveštaj

Datum: 02.09.2026.

Ovaj dokument opisuje šta je urađeno u ovoj fazi (kontejnerizacija svih servisa +
uvođenje v1/v2 verzija Booking servisa), zašto su pojedine odluke donete onako
kako jesu, kako se sve pokreće lokalno, i šta **nije** urađeno (ostavljeno za
sledeću fazu — Kubernetes i Argo Rollouts). Namenjeno je i kao materijal za sâm
diplomski rad (poglavlje o infrastrukturi), ne samo kao interna beleška.

## 1. Kratak pregled

| Šta | Status |
|---|---|
| Dockerfile za svih 7 komponenti (5 servisa + gateway + frontend) | ✅ |
| `docker-compose` koji podiže ceo sistem jednom komandom | ✅ |
| Booking servis — v1/v2 verzionisanje preko env promenljive | ✅ |
| Booking v2 — sinhrona provera provajdera/usluge kod provider-service-a | ✅ |
| `X-Booking-Service-Version` header za vizuelnu proveru koja verzija je odgovorila | ✅ |
| Kubernetes manifesti | ⛔ (sledeća faza) |
| Argo Rollouts (pravi canary — postepeno % saobraćaja v1 → v2) | ⛔ (sledeća faza) |
| CI/CD | ⛔ |

Bitna napomena o metodu rada: **ovo sandbox okruženje nema instaliran Docker,
.NET SDK ni Maven** (proverio sam `docker --version`, `which dotnet`, `which mvn`
— sve odsutno). Sve što sledi je napisano i **ručno pregledano** (linija po
liniju, upoređivano sa postojećim radnim kodom i sa zvaničnom dokumentacijom
alata — npr. Spring-ovom relaxed-binding konvencijom za env promenljive), ali
**nije lokalno kompajlirano ni pokrenuto od strane mene**. Pre nego što se ovo
uključi u odbranu rada, preporučujem da se na tvojoj mašini (gde Docker Desktop
već postoji) jednom pokrene `docker compose up --build` i potvrdi da sve
provede zdravo — vidi sekciju 5 (Kako pokrenuti) i sekciju 7 (Poznati rizici).

## 2. Docker — Dockerfile po servisu

Svi Dockerfile-ovi prate multi-stage obrazac (build stage → mali runtime stage
bez SDK-a), ali se razlikuju po tome **odakle se gradi** (build context), zato
što projekat ima dva različita stila deljenja koda:

### 2.1 .NET servisi (auth, provider, payment, gateway)

`backend/services/{auth,provider,payment}-service/Dockerfile`,
`backend/gateway/Gateway/Dockerfile`.

- Build stage: `mcr.microsoft.com/dotnet/sdk:8.0`, runtime: `mcr.microsoft.com/dotnet/aspnet:8.0`.
- **Build context mora biti koren repozitorijuma**, ne folder servisa — svaki
  `.csproj` koristi relativni `<Compile Include="..\..\building-blocks\...">`
  (Contracts/Messaging/Observability se dele preko fajl-sistema, ne preko NuGet
  paketa), pa Docker mora da vidi i `backend/building-blocks/` i
  `Directory.Build.props`/`Directory.Packages.props` iz korena.
- `global.json` (pinuje .NET **10** SDK, jer je to jedino što je instalirano na
  razvojnoj mašini) se **namerno ne kopira** u image — build image već ima tačno
  .NET **8** SDK koji `TargetFramework net8.0` traži, bez potrebe za
  `rollForward` logikom koja bi inače pokušala (i ne uspela) da nađe .NET 10 SDK
  unutar kontejnera.
- Runtime image `aspnet:8.0` već podrazumevano postavlja
  `ASPNETCORE_HTTP_PORTS=8080` — to se poklapa sa Gateway-ovim postojećim
  `appsettings.json` (`http://auth-api:8080` itd.), pa nije trebalo menjati
  Gateway konfiguraciju, samo imenovati kontejnere tačno tako u compose-u.

Primer build komande (iz korena):
```
docker build -f backend/services/auth-service/Dockerfile -t chronos/auth-service:v1 .
```

### 2.2 Java servisi (booking, notification)

`backend/services/{booking,notification}-service/Dockerfile`.

- Build stage: `maven:3.9.9-eclipse-temurin-21`, runtime: `eclipse-temurin:21-jre`.
- Ovi moduli **nemaju** deljene lokalne fajlove van svog foldera (samostalni
  Maven moduli), pa je build context **folder samog servisa**, ne koren.
- `spring-boot-maven-plugin` pravi izvršni "fat" jar (`target/*.jar`, original
  neizvršni jar se čuva kao `*.jar.original` i ne pogađa `COPY` glob).
- `notification-service` ima poseban komentar u Dockerfile-u: njegov
  `application.properties` hardkoduje `server.port=8082` (da ne bi kolidirao sa
  drugim servisima kad se sve pokreće direktno na `localhost`-u van kontejnera),
  ali Gateway očekuje `notification-api:8080` — rešeno `SERVER_PORT=8080`
  env promenljivom u `docker-compose`-u, ne izmenom `application.properties`
  (Spring relaxed binding: `server.port` ↔ `SERVER_PORT`).

Primer build komande:
```
docker build -f backend/services/booking-service/Dockerfile -t chronos/booking-service:v1 backend/services/booking-service
```

### 2.3 Frontend

`frontend/Dockerfile` — `node:20-alpine` build stage (`npm ci` pa
`npm run build`) → `nginx:1.27-alpine` runtime stage koji samo servira
`dist/`.

- `VITE_API_BASE_URL` se "peče" u JS bundle **u trenutku build-a** (Vite čita
  `import.meta.env.*` samo pri build-u, ne u runtime-u kontejnera) — zato je to
  Docker `ARG`, ne environment promenljiva kontejnera. Podrazumevana vrednost
  (`http://localhost:5076`) odgovara host portu na koji je gateway mapiran u
  compose-u.
- `frontend/nginx.conf` — sluša na 8080, i ima
  `try_files $uri $uri/ /index.html;` jer `AppRouter.tsx` sam čita
  `window.location.pathname` (nema pravu router biblioteku) — bez ovoga bi
  refresh na dubljoj ruti (npr. `/providers/abc-123`) vratio 404 od nginx-a
  umesto da React preuzme.

## 3. `docker-compose` — kako je sve povezano

Fajl: `infra/docker/compose.yaml` (proširen, postojeća `sqlserver`/`rabbitmq`
definicija je ostala netaknuta).

### 3.1 Novi servisi u compose-u

`sqlserver-init`, `auth-api`, `provider-api`, `payment-api`, `gateway`,
`booking-api`, `notification-api`, `frontend`.

### 3.2 Bitne odluke

**`ASPNETCORE_ENVIRONMENT=Production` eksplicitno na svakom .NET servisu.**
Namerno, da se **ne** učita `appsettings.Development.json` (koji ima
hardkodovane `localhost` connection stringove i Stripe test ključeve za lokalni
dev bez kontejnera) — u kontejneru se koristi samo bazni `appsettings.json`
(koji ima prazan `""` sentinel za tajne) plus environment promenljive
postavljene u compose-u (`Ključ__PodKljuc` konvencija za ugnježdene sekcije,
npr. `ConnectionStrings__Database`).

**Baze podataka na SQL Server-u se moraju ručno kreirati pre prve migracije —
posebno za Java servise.** `mcr.microsoft.com/mssql/server` slika nema
ugrađen `docker-entrypoint-initdb.d` mehanizam (za razliku od npr. `postgres`
slike). Za .NET servise ovo i nije kritično jer `Database.Migrate()` sâm
kreira bazu ako ne postoji — ali **Flyway (booking-service, notification-service)
to ne radi**: JDBC connection string već sadrži `databaseName=BookingDb`, a SQL
Server odbija konekciju ka bazi koja ne postoji (za razliku od npr. Postgres-a
gde se prvo konektuješ na default bazu). Zato je dodat poseban jednokratan
servis `sqlserver-init` koji, čim je `sqlserver` healthy, kroz `sqlcmd` kreira
svih 5 baza (`IF DB_ID('X') IS NULL CREATE DATABASE X`, idempotentno) i onda se
gasi; svi ostali servisi čekaju `sqlserver-init: condition:
service_completed_successfully` pre nego što krenu.

**Volumen za upload-ovane slike.** `provider-service` čuva slike provajdera/usluga
na disku (`wwwroot/uploads/`, vidi `Program.cs`) — bez imenovanog volumena
(`provider-uploads:/app/wwwroot/uploads`) bi se sve slike izgubile na svaki
`docker compose up --build`.

**Booking servis — namerno JEDAN kontejner, ne dva.** Razmišljao sam o tome da
odmah startujem `booking-api-v1` i `booking-api-v2` kao dva odvojena kontejnera
i da Gateway (YARP) round-robin-uje između njih (YARP klaster podržava više
destinacija) — to bi dalo neku vrstu "canary-a" već u `docker-compose`-u. Odustao
sam od toga namerno: to bi zahtevalo izmenu Gateway `appsettings.json`
(dodavanje druge destinacije u klaster), a ta izmena bi bila **bačena posao**
čim krene prava K8s/Argo Rollouts faza, gde tačno tu ulogu (postepeno % saobraćaja
između dve verzije iste komponente, ispod jednog K8s Service-a) preuzima Argo
Rollouts. Za sada je `booking-api` jedan kontejner, čija verzija se bira preko
`BOOKING_VERSION` env promenljive (podrazumevano `v1`, override-uje se sa
`BOOKING_VERSION=v2 docker compose up booking-api` za ručno testiranje v2 puta).

**Otkriven i ispravljen bag u planiranju:** Spring-ova "relaxed binding"
konvencija za environment promenljive **uklanja crtice** iz imena svojstva
umesto da ih pretvara u `_` — zvanični primer iz Spring Boot dokumentacije je
`spring.main.log-startup-info` → `SPRING_MAIN_LOGSTARTUPINFO`. To znači da
svojstvo `provider-service.base-url` NIJE `PROVIDER_SERVICE_BASE_URL` (kako sam
prvobitno planirao) nego **`PROVIDERSERVICE_BASEURL`** — ispravljeno u
`compose.yaml` pre nego što je bilo gde drugde upotrebljeno, uz komentar na
mestu greške da se ne ponovi.

### 3.3 Portovi (host → kontejner)

| Servis | Host port | Napomena |
|---|---|---|
| frontend | 5173 | isto kao `npm run dev` |
| gateway | 5076 | jedina komponenta koju frontend/browser direktno pogađa |
| auth-api | 5094 | isti port kao lokalni dev |
| provider-api | 5033 | isti port kao lokalni dev |
| payment-api | 5164 | isti port kao lokalni dev |
| booking-api | 8083 | novo (u lokalnom dev-u se pokretalo na 8080) |
| notification-api | 8082 | isti port kao lokalni dev (`server.port` u fajlu) |
| sqlserver | 1433 | isto |
| rabbitmq | 5672 / 15672 | isto (management UI na 15672) |

## 4. Booking v1/v2 — verzionisanje i validacija provajdera

Cilj ove faze nije bio da se Booking servis prepiše u drugi jezik/tehnologiju
(razmatrano, pa odbačeno — Argo Rollouts radi na nivou kontejnera/Deployment-a,
potpuno je nezavisan od toga kojim je jezikom servis pisan; prepisivanje bi bio
nepotreban rizik bez ikakve koristi za sâm canary mehanizam). Umesto toga: **isti
Docker image, isti kod, ponašanje se grana preko jedne env promenljive** — tačno
onako kako će Argo Rollouts kasnije očekivati (dva `Deployment`-a od istog image
taga ili dva taga, razlika samo u konfiguraciji).

### 4.1 Šta v2 radi drugačije od v1

Novi fajl `ProviderServiceClient.java`
(`infrastructure/http/ProviderServiceClient.java`) — sinhron HTTP poziv (Java
21 ugrađeni `java.net.http.HttpClient`, bez dodatne biblioteke) ka
`provider-service`-u, PRE potvrde rezervacije:

1. `GET /api/v1/providers/{providerId}` — proverava da provajder postoji i da
   je `isActive`.
2. `GET /api/v1/services/{serviceId}` — proverava da usluga postoji, da je
   aktivna, i da **stvarno pripada** tom provajderu (`providerId` poklapanje) —
   hvata slučaj gde bi front (greškom ili namerno) poslao neusklađen par
   provider/usluga.

Oba endpointa su već postojala kao javni, neautentifikovani GET-ovi u
`provider-service`-u (`ProviderController`/`ServiceController`) — nije trebalo
menjati provider-service uopšte. Ako bilo koja provera ne prođe (ili poziv ka
provider-service-u ne uspe/istekne za 3s), baca se `InvalidBookingException`,
koju `GlobalExceptionHandler` već mapira u HTTP 400 — v2 poziva samo dodaje
NOVI razlog za 400 grešku, ne menja postojeće ponašanje.

**v1 ovo namerno ne radi** — veruje frontu kao i do sada. Ovo je i realan,
dokumentovan gap koji je već postojao u `docs/progress-report.md` (front bira
provajdera i uslugu, booking-service ranije nije proveravao da li par uopšte
postoji/odgovara), pa v2 nije veštački izmišljena razlika — zatvara pravi
propust, što čini demonstraciju smislenijom (v2 zaista je "bolja" verzija, ne
samo verzija sa drugačijim brojem).

### 4.2 Kako se bira verzija

`application.properties`:
```properties
booking.version=v1
provider-service.base-url=http://localhost:5033
```

`BookingServiceImpl` sada prima `@Value("${booking.version}")` u konstruktoru i
grana se u `createBooking(...)`:
```java
if ("v2".equalsIgnoreCase(bookingVersion)) {
    providerServiceClient.assertProviderAndServiceAreBookable(request.providerId(), request.serviceId());
}
```
Grananje je odmah posle idempotency provere, pre provere preklapanja termina —
ako je zahtev nevalidan (provajder/usluga ne postoje), nema smisla trošiti
upit ka bazi za proveru preklapanja.

### 4.3 Kako se verzija vidi spolja

Novi fajl `VersionHeaderFilter.java` (`web/config/`) — Spring `Filter` bean,
Spring Boot ga automatski registruje na `/*`, dodaje
`X-Booking-Service-Version: v1` (ili `v2`) header na **svaki** HTTP odgovor.
Ovo je bitno za sâmu demonstraciju rollout-a: kad Argo Rollouts kasnije bude
postepeno prebacivao saobraćaj sa v1 na v2 pod, ovaj header je ono što se u
`curl -i` ili browser network tabu vidi kao "dokaz" da je zahtev stvarno
opsluženo od druge verzije, bez potrebe da se gleda u logove poda.

## 5. Kako pokrenuti lokalno

Iz korena repozitorijuma:
```powershell
docker compose -f infra/docker/compose.yaml up --build
```

Prvi put će potrajati (build svih 7 image-a + `mvn dependency:go-offline` +
`npm ci`). Redosled paljenja je automatski (`depends_on` + healthcheck-ovi):
`sqlserver` → `sqlserver-init` (kreira baze) → svi backend servisi → `gateway` →
`frontend`.

Frontend: http://localhost:5173
Gateway (API): http://localhost:5076

Admin nalog se i dalje seed-uje automatski pri prvom paljenju `auth-api`
(`admin@admin.com` / `admin`, isto kao u lokalnom dev-u).

### Testiranje v2 Booking ponašanja

```powershell
$env:BOOKING_VERSION="v2"; docker compose -f infra/docker/compose.yaml up --build booking-api
```
Zatim npr. `curl -i http://localhost:8083/api/v1/bookings/...` (kroz Gateway:
`http://localhost:5076/api/v1/bookings/...`) i proveriti
`X-Booking-Service-Version: v2` header u odgovoru, i da rezervacija sa
nepostojećim/neaktivnim `serviceId`/`providerId` vraća 400 (dok bi v1 to
propustio).

### Gašenje i čišćenje

```powershell
docker compose -f infra/docker/compose.yaml down          # zaustavi, zadrži podatke (volumeni ostaju)
docker compose -f infra/docker/compose.yaml down -v        # zaustavi i obriši i podatke (baze, uploads, rabbitmq)
```

## 6. Verifikacija — šta je i šta nije provereno

Pošto ovo sandbox okruženje nema Docker/.NET/Maven, verifikacija je urađena
isključivo **ručnim pregledom koda**, u više prolaza:

- Svaki Dockerfile pregledan liniju po liniju — build context, COPY putanje,
  ENTRYPOINT/CMD, EXPOSE port — upoređeno sa stvarnom strukturom `.csproj`/`pom.xml`
  fajlova i postojećim `Program.cs`/`application.properties` konvencijama.
- `compose.yaml` sintaksno proveren (`python3 -c "import yaml; yaml.safe_load(...)"`
  — validan YAML, svi servisi/volumeni se učitavaju).
- Svaki novi/izmenjeni Java fajl (`ProviderServiceClient`, `VersionHeaderFilter`,
  `BookingServiceImpl`) ručno upoređen sa postojećim konvencijama u istom
  projektu (npr. Jackson 3 `tools.jackson` paket umesto `com.fasterxml`,
  `InvalidBookingException` konstruktor, `CreateBookingRequest` record polja) —
  sve postoji i poklapa se.
- Env-var konvencije (ASP.NET `Ključ__PodKljuc`, Spring relaxed binding)
  provereni prema zvaničnoj dokumentaciji, ne pretpostavljeni — otkrivena i
  ispravljena greška opisana u 3.2 (`PROVIDERSERVICE_BASEURL`).

Ono što **nisam mogao** da proverim: da li se `.NET` projekat zaista uspešno
`dotnet publish`-uje unutar `sdk:8.0` image-a (npr. da nema neku skrivenu
zavisnost na .NET 10-specifičnu sintaksu), da li Maven build prolazi bez
mrežnih problema, da li nginx konfiguracija radi tačno kako očekujem, i da li
`sqlcmd` u `sqlserver-init` batch-u zaista uspešno kreira sve baze bez greške
u sintaksi. **Preporuka**: prvo pokretanje `docker compose up --build` uraditi
sa vremenom za debagovanje, ne neposredno pred odbranu.

## 7. Poznati rizici / stvari za dvostruku proveru

- `sqlserver-init` koristi `bash -c` petlju sa `sqlcmd` — ako `mssql/server`
  image u međuvremenu promeni putanju alata (`/opt/mssql-tools18/bin/sqlcmd`),
  ovo bi pukло. Lako se dijagnostikuje: `docker compose logs sqlserver-init`.
- Stripe test ključevi su i dalje u čistom tekstu u `compose.yaml` (isti test
  ključevi koji su već u `appsettings.Development.json` i već su prošli kroz
  GitHub secret-scanning ranije u ovom projektu) — bezbedno jer su test-mode i
  ne mogu pomeriti pravi novac, ali GitHub push protection će verovatno **opet**
  reagovati na push ovog fajla (vidi `docs/docker-i-v2-izvestaj.md` sekciju
  "Git" u glavnom izveštaju o Stripe integraciji za kako se to rešava).
- Prvi build će biti spor (nema cache-a) — Docker layer caching će ubrzati
  sledeće build-ove dokle god se `.csproj`/`pom.xml`/`package.json` ne menjaju.

## 8. Šta dalje (van obima ove faze)

- Kubernetes manifesti (Deployment/Service/Ingress/ConfigMap/Secret po servisu).
- Argo Rollouts `Rollout` resurs za `booking-api` — pravo postepeno
  preusmeravanje saobraćaja v1 → v2 (10% → 50% → 100%), sa automatskim
  rollback kriterijumima.
- CI/CD pipeline (build + push image-a, deploy).
- Observability (metrike, Prometheus/Grafana) — pomenuto u specifikaciji, još
  nije početo.

## 9. Pregled izmenjenih/novih fajlova

**Novo:**
- `.dockerignore` (koren)
- `backend/services/{auth,provider,payment}-service/Dockerfile`
- `backend/gateway/Gateway/Dockerfile`
- `backend/services/{booking,notification}-service/Dockerfile` + `.dockerignore`
- `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore`
- `backend/services/booking-service/.../infrastructure/http/ProviderServiceClient.java`
- `backend/services/booking-service/.../web/config/VersionHeaderFilter.java`
- `docs/docker-i-v2-izvestaj.md` (ovaj fajl)

**Izmenjeno:**
- `backend/services/{auth,provider,payment}-service/Program.cs` (migracija pri startu)
- `backend/services/booking-service/src/main/resources/application.properties` (`booking.version`, `provider-service.base-url`)
- `backend/services/booking-service/.../application/services/BookingServiceImpl.java` (v2 grananje)
- `infra/docker/compose.yaml` (prošireno na ceo sistem)
- `docs/progress-report.md` (ažuriran status)
