# Retrospektiva — uloge, usluge, kategorije, partner nalog

Pregled onoga što je urađeno u ovoj fazi razvoja, šta je novo i šta treba proveriti pre daljeg rada.

## 1. Ranije završeno (podsetnik)

- **Booking mikroservis** (Java/Spring Boot) — CRUD rezervacija, RabbitMQ eventi (outbox obrazac), provera preklapanja termina, penal za kasno otkazivanje, SLF4J logovanje, engleske poruke grešaka. Pušteno na `main` granu.
- **.NET skelet** — Gateway (YARP reverse proxy), Auth servis (registracija/login/JWT), Payment servis (kreiranje/završetak plaćanja), Provider servis (osnovni CRUD).
- **Frontend vizuelni identitet** — navbar, footer, home page (hero, kalendarska grafika, kategorije), odvojene login/register stranice, logo i tipografija.
- **Javna lista i detalj pružaoca usluga** — `/providers` i `/providers/:id`, sa pravom Leaflet + OpenStreetMap mapom.

## 2. Novo u ovoj fazi

### Uloge korisnika (Auth servis)

- `User` sada ima `Role`: `Client` (klijent), `Partner`, `Admin`.
- Registracija nudi izbor Klijent/Partner. `Admin` se ne može registrovati preko forme — hardkodovan nalog `admin@admin.com` / `admin` se sam kreira pri prvom pokretanju Auth servisa.
- JWT token nosi ulogu (claim), koristi se za `[Authorize(Roles = "...")]` zaštitu na drugim servisima.
- Login i registracija sada vraćaju konkretne greške na frontu ("nalog ne postoji", "pogrešna lozinka", "email već postoji"), umesto tihog neuspeha.
- Registracija: dodata potvrda lozinke, i automatska prijava odmah posle uspešne registracije.

### Provider servis — prošireno

- `ProviderProfile` dobio: sliku, adresu, geografske koordinate, kontakt telefon i email.
- **`GET /api/v1/providers/me`** — vraća profil ulogovanog partnera; ako ne postoji, automatski ga kreira (get-or-create). Nema posebnog koraka "postani partner".
- **`PUT /api/v1/providers/me`** — izmena sopstvenog profila.
- Provider servis sad ima JWT proveru (ranije je nije imao nijedan servis osim Auth-a).

### Usluge — nova tabela `Services`

- Polja: naziv, opis, kategorija, trajanje (minuti), cena, vezana za `ProviderId`.
- **`/api/v1/providers/me/services`** (GET/POST/PUT/DELETE) — isključivo za ulogovanog partnera. Backend proverava da partner vidi i menja SAMO svoje usluge (ako pokuša da izmeni tuđu, dobija 404, ne 403 — namerno, da ne otkriva da usluga uopšte postoji).

### Kategorije — nova tabela `Categories`

- Naziv + ikonica (za sada tekstualna putanja/link, ne pravi upload).
- **`GET /api/v1/categories`** — javno vidljivo svima.
- **`POST`/`PUT /api/v1/categories`** — samo za Admin ulogu.

### Frontend — nove stranice

- **Nav meni po ulozi** — Partner vidi: Usluge / Menadžer usluga / Profil / Odjava. Klijent vidi: Usluge / Moje rezervacije / Profil / Odjava.
- **`/manage/services`** — partner dodaje, menja i briše svoje usluge (forma + lista).
- **`/profile`** — partner uređuje naziv, opis, sliku, adresu, koordinate (sa live prikazom na mapi), telefon, email.

## 3. Šta moraš odraditi pre testiranja

Migracije (proveri da li su sve primenjene, redosledom kojim su tražene):

```
cd backend/services/auth-service
dotnet ef migrations add AddUserRole
dotnet ef database update

cd ../provider-service
dotnet ef migrations add AddServicesAndCategories
dotnet ef database update

dotnet ef migrations add AddProviderContact
dotnet ef database update
```

Ako je neka od njih već primenjena, `dotnet ef migrations add` neće praviti štetu — samo će prijaviti da nema promena za tu tačku (ili napraviti praznu migraciju ako je stvarno već primenjena; u tom slučaju je obriši).

## 4. Predloženi redosled testiranja

1. Registruj se kao **Partner**.
2. Idi na **Profil**, popuni podatke (ime, adresa, koordinate — probaj npr. Novi Sad: `45.2671, 19.8335`), sačuvaj.
3. Idi na **Menadžer usluga**, dodaj par usluga (prvo mora postojati bar jedna kategorija — dodaje se samo preko API-ja za sada, vidi napomenu ispod).
4. Otvori **`/providers`** kao anoniman korisnik ili Klijent — proveri da se partner pojavljuje u javnoj listi.

## 5. Poznati nedostaci (za sledeće korake)

- **Nema još nijedne kategorije u bazi** — moraš je ručno dodati preko API-ja (npr. Postman/curl) pošto admin UI za kategorije još ne postoji na frontu. Bez bar jedne kategorije, "Menadžer usluga" ne može da doda uslugu.
- **Javna stranica provajdera ne prikazuje njegove usluge** — `/providers/:id` trenutno pokazuje samo profil (slika, opis, mapa), ne i listu usluga koje nudi. Nema ni javnog API endpointa za to (`/me/services` je samo za vlasnika).
- **Booking (rezervacije) flow nije povezan sa uslugama** — `BookingsPage` je i dalje prazan mock, ne zna za novi `Service` katalog.
- **Nema upload slika** — samo tekstualna putanja/link, ni za profil ni za kategorije.
- **Nema admin UI** — kategorije, upravljanje partnerima itd. postoji samo kao API, nema frontend ekrana za Admin ulogu.
- **Docker / Kubernetes / Argo Rollouts** (glavni deo diplomskog) — nije ni započeto.
