# Slanje mejlova (rezervacija i plaćanje)

## Šta se šalje

| Događaj | Kupcu | Partneru |
|---|---|---|
| `booking.created` | „Rezervacija potvrđena“: usluga, partner, adresa, termin, cena, broj rezervacije | „Nova rezervacija“: ime, mejl i telefon klijenta, usluga, termin, cena |
| `booking.payment-confirmed` | „Plaćanje uspešno“: usluga, partner, termin, plaćeni iznos | „Rezervacija plaćena“: klijent, usluga, termin, iznos |

Otkazivanje se i dalje samo beleži u bazi (admin panel, tab Obaveštenja), bez mejla.

## Kako radi (tok kroz mikroservise)

1. `booking-service` upisuje događaj u outbox, a zatim ga objavljuje na RabbitMQ.
   Događaj nosi samo ID-jeve (kupac, partner, usluga), termin i cenu, bez ličnih podataka.
2. `notification-service` (`BookingEventListener`) primi događaj i zapiše obaveštenje u
   `NotificationDb`. Ako je događaj duplikat (isti `eventId`), obrada se prekida i mejl se
   ne šalje ponovo.
3. `BookingEmailNotifier` dohvata podatke koji nedostaju:
   - od `auth-service`: ime, mejl i telefon kupca, preko internog
     `GET /internal/users/{id}`. Ovaj endpoint nije izložen kroz Gateway i traži zaglavlje
     `X-Internal-Key`.
   - od `provider-service`: naziv, adresu i `ContactEmail` partnera (`GET /api/v1/providers/{id}`)
     i naziv usluge (`GET /api/v1/services/{id}`).
4. `EmailService` šalje HTML mejl (UTF-8, latinica sa dijakritikom) preko SMTP-a.

Neuspeo mejl se samo loguje i ne ruši obradu događaja. Ako partner nema popunjen
„Kontakt email“ na profilu, njegov mejl se preskače.

## Besplatan SMTP koji stvarno isporučuje mejl: Gmail App Password

Besplatan je, mejl stiže u pravi inbox, a limit je oko 500 mejlova dnevno, što je
dovoljno za demo i odbranu.

1. Na Gmail nalogu uključi **2-Step Verification** (Google Account → Security).
2. Google Account → Security → **App passwords** (ili https://myaccount.google.com/apppasswords),
   napravi novi, npr. „Chronos“. Google prikaže 16-karakternu lozinku.
3. U folderu `backend/services/notification-service` kopiraj `secrets.properties.example`
   u `secrets.properties` i upiši:
   ```
   notifications.email.enabled=true
   spring.mail.username=tvoj.nalog@gmail.com
   spring.mail.password=abcdefghijklmnop   (App Password, bez razmaka)
   notifications.email.from=tvoj.nalog@gmail.com
   ```
   `secrets.properties` je u `.gitignore`, pa lozinka ne završava na git-u.
4. Pokreni sistem sa `.\run-local.ps1`. Skripta sada pokreće i Notification Service.

Alternativa bez Gmail-a je **Brevo** (besplatno, 300 mejlova dnevno):
`spring.mail.host=smtp-relay.brevo.com`, port `587`, a username i SMTP key dobiješ u
Brevo panelu (SMTP & API). Pošiljalac mora biti verifikovan u Brevo-u.

## Docker Compose / Kubernetes

- Compose: kopiraj `infra/docker/.env.example` u `infra/docker/.env`, postavi
  `NOTIFICATIONS_EMAIL_ENABLED=true` i upiši `SMTP_USERNAME`/`SMTP_PASSWORD`/`SMTP_FROM`
  (iste vrednosti kao u `secrets.properties`), pa ponovo `up -d notification-api`.
- Kubernetes: upiši `SMTP_USERNAME` i `SMTP_PASSWORD` u `02-secret.yaml` i postavi
  `NOTIFICATIONS_PROVIDER_EMAIL_ENABLED: "true"` u `01-configmap.yaml`. Stari naziv i dalje
  radi kao prekidač.

## Provera

1. Na profilu partnera (Profil → Kontakt email) upiši adresu koju možeš da otvoriš.
2. Kao klijent napravi rezervaciju, pa je plati.
3. U logu Notification Service-a traži:
   - `Sent email '...' to ...`: poslato.
   - `Email sending is disabled`: `notifications.email.enabled` nije `true`.
   - `Failed to send email` + `AuthenticationFailedException`: pogrešan App Password.
   - `auth-service returned status 401`: `INTERNAL_API_KEY` se ne poklapa sa `Internal:ApiKey`.
