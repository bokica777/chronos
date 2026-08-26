# Kako radi plaćanje — detaljan tok komunikacije

> **Napomena (avgust 2026):** Ovaj dokument je prvobitno opisivao čistu simulaciju (dva poziva ka payment-service-u, bez ikakve spoljne provere). Od ovog trenutka payment-service koristi **pravi Stripe Checkout u test modu** — odeljci 3 i 4 ispod su ažurirani da opisuju novi tok; stari opis simulacije je ostavljen u odeljku 3a radi konteksta (i dalje postoji kao fallback, vidi napomenu tamo). Odeljak 6 opisuje kako lokalno testirati Stripe webhook.

Ovaj dokument objašnjava tačno šta se dešava, korak po korak, kada korisnik na stranici "Moje rezervacije" klikne dugme za plaćanje — koji servisi se pozivaju, šta se šalje, šta se čuva u bazi, i zašto trenutno ne postoji nijedno *naše* polje za unos broja kartice.

## 1. Pregled — ko sa kim priča

Bitno je odmah reći: **booking-service i payment-service nikad direktno ne razgovaraju jedan sa drugim.** Ceo tok orkestrira frontend (React aplikacija u browseru) — ona zna id rezervacije i njenu cenu (jer ih je upravo dobila od booking-service-a), pa te podatke prosledi payment-service-u u dva odvojena poziva. To je odluka koju smo doneli namerno (u odnosu na alternativu gde bi booking-service sam, sinhrono, zvao payment-service preko REST-a) — jednostavnije je za implementaciju i za odbranu, po cenu da payment-service "veruje" frontu da rezervacija zaista postoji i da je cena tačna, umesto da to sam proveri.

Svi pozivi idu kroz isti API Gateway kao i ostatak aplikacije (`/api/v1/payments/...` ruta postoji od Faze 6), i svaki poziv nosi isti JWT token (isti onaj kojim si ulogovan) u `Authorization: Bearer ...` header-u — to je ono što smo dodali u prošlom koraku, jer payment-service ranije nije proveravao token uopšte.

## 2. Šta se dešava kad otvoriš "Moje rezervacije" (pre klika)

Pre nego što uopšte vidiš dugme, frontend za svaku tvoju (neotkazanu) rezervaciju pita payment-service da li već postoji plaćanje za nju:

```
GET /api/v1/payments/booking/{bookingId}
Authorization: Bearer <tvoj JWT>
```

- Ako plaćanje ne postoji, payment-service vraća **404** — frontend to tumači kao "nije greška, samo još nije plaćeno" i prikazuje dugme "Simuliraj plaćanje".
- Ako plaćanje već postoji, vraća **200** sa statusom (`Pending`, `Completed`, `Failed` ili `Refunded`) — frontend prikazuje bedž umesto dugmeta (zeleno "Plaćeno" ako je `Completed`, sivo inače).

## 3. Šta se dešava kad klikneš dugme (Stripe Checkout tok)

Klik na "Plati" u `handlePay` (`BookingsPage.tsx`) sada radi ovo:

1. **`POST /api/v1/payments`** — isto kao ranije (vidi opis Poziva 1 u odeljku 3a ispod) — kreira se ili se dohvata postojeći `Payment` zapis, status `Pending`.
2. Ako je status `Pending`, front zove **`POST /api/v1/payments/{id}/checkout-session`**. Na backendu (`PaymentServiceImpl.CreateCheckoutSessionAsync`) ovo pravi pravu Stripe Checkout sesiju preko Stripe.net SDK-a (`stripeClient.V1.Checkout.Sessions.CreateAsync`) — šalje se stavka sa nazivom `Chronos rezervacija {bookingId}` i iznosom u **EUR** (ne RSD — vidi napomenu ispod), plus `success_url`/`cancel_url` koji vode nazad na `/bookings` sa query parametrima. Stripe vraća `sessionId` i `checkoutUrl` (Stripe-om hostovanu stranicu za unos kartice); mi taj `sessionId` upišemo u `Payment.StripeSessionId` da bismo kasnije znali koju sesiju da proverimo.
3. Front radi `window.location.href = checkoutUrl` — **korisnik napušta Chronos i ide na pravu Stripe stranicu**, gde unosi test broj kartice (npr. `4242 4242 4242 4242`, bilo koji budući datum, bilo koji CVC — to su Stripe-ovi standardni test brojevi, ne prave se prave naplate).
4. Nakon što Stripe obradi plaćanje, redirektuje korisnika nazad na `success_url` (`/bookings?payment=success&paymentId=...`) ili `cancel_url` (`?payment=cancelled&paymentId=...`) ako je otkazao.
5. Kad se `BookingsPage` učita i vidi `?payment=success&paymentId=...` u URL-u, odmah zove **`POST /api/v1/payments/{id}/confirm-stripe`** — backend (`ConfirmStripeSessionAsync`) proveri kod Stripe-a (`Sessions.GetAsync`) da li je `payment_status == "paid"`, i ako jeste, završi plaćanje (`Payment.Complete()`) na isti način kao stari `/complete` poziv.
6. **Nezavisno od koraka 5**, Stripe i sam šalje webhook (`checkout.session.completed`) na `POST /api/v1/payments/webhooks/stripe` — ovo je pouzdaniji put jer radi i ako korisnik zatvori tab pre nego što se vrati na `success_url`. Webhook ruta je idempotentna (ne pada ako plaćanje već jeste `Completed`).

**Zašto EUR a ne RSD?** Stripe-ova dokumentacija za RSD kao "presentment currency" ima poznatu nedoslednost oko decimala (rizik da se naplati 100x pogrešan iznos na test kartici). Da bismo to izbegli, Checkout sesija se pravi u EUR-ima po fiksnom ilustrativnom kursu `1 EUR = 117 RSD` (`PaymentServiceImpl.RsdToEurRate`) — ovo utiče samo na iznos prikazan na Stripe stranici; svuda drugde u Chronos-u (baza, admin panel, UI) cena i dalje ostaje u RSD. Ovo je dokumentovano kao svesno pojednostavljenje, ne kao greška.

### 3a. Stari opis (čista simulacija, i dalje relevantan za `/complete` rutu)

`POST /api/v1/payments/{id}/complete` ruta i dalje postoji i radi na isti "simulirani" način opisan ispod (odmah završava plaćanje bez ikakve spoljne provere) — koristi je i dalje admin panel/testiranje, i teorijski bi mogla da posluži kao fallback ako Stripe ne bi bio dostupan. Klik pokreće **dva uzastopna HTTP poziva** ka payment-service-u, jedan za drugim:

**Poziv 1 — kreiranje uplate**

```
POST /api/v1/payments
Authorization: Bearer <tvoj JWT>
Content-Type: application/json

{
  "bookingId": "3f2a...",
  "amount": 1500,
  "currency": "RSD"
}
```

`amount` je cena koju je booking-service već vratio kad je rezervacija napravljena (`booking.price`) — frontend je ne pita korisnika, samo je pročita iz podataka koje već ima. `currency` je fiksno "RSD" (hardkodovano na frontu, aplikacija ne podržava druge valute).

Na backendu (`PaymentController.Create` → `PaymentServiceImpl.CreatePaymentAsync`):
1. Prvo se proveri da li već postoji plaćanje za taj `bookingId` (idempotentnost — ako si greškom kliknuo dvaput, ne pravi se duplikat, vraća se postojeći zapis).
2. Ako ne postoji, pravi se novi `Payment` objekat: `Id` (novi GUID), `BookingId`, `Amount`, `Currency`, `Status = Pending`, `CreatedAtUtc = sada`.
3. Upisuje se u `PaymentDb` bazu, tabela `Payments`.
4. Vraća se `201 Created` sa telom `{ id, bookingId, amount, currency, status: "Pending" }`.

**Poziv 2 — završetak uplate**

Čim front dobije odgovor iz Poziva 1 i vidi da je status `"Pending"`, odmah (bez ikakve pauze ili potvrde) šalje:

```
POST /api/v1/payments/{id}/complete
Authorization: Bearer <tvoj JWT>
```

Na backendu (`PaymentController.Complete` → `PaymentServiceImpl.CompletePaymentAsync`):
1. Učita se `Payment` po `id`-u.
2. Pozove se domenska metoda `payment.Complete()` — ona samo proveri da je trenutni status `Pending` (u suprotnom baca grešku) i postavi `Status = Completed`. Nema nikakve provere kartice, banke, OTP-a — ništa spolja se ne poziva.
3. Upiše se promena u bazu.
4. Pokuša se objaviti event `PaymentCompleted` (`{ paymentId, bookingId }`) preko `IEventPublisher` — **ali ovo trenutno samo ide u log**, ne stiže stvarno na RabbitMQ (objašnjeno u odeljku 5).
5. Vraća se `200 OK` sa `{ ..., status: "Completed" }`.

Frontend na kraju upamti taj odgovor (`setPayments(...)`) i kartica rezervacije se odmah osveži — dugme nestaje, pojavljuje se zeleni bedž "Plaćeno".

Ceo tok, od klika do zelenog bedža, traje koliko traju ta dva HTTP poziva — obično ispod pola sekunde, bez ikakvog čekanja ili učitavanja koje bi ličilo na pravu banku.

## 4. Zašto Chronos nema svoje polje za unos broja kartice

Odgovor se promenio otkad postoji pravi Stripe Checkout: **broj kartice se sada unosi, ali na Stripe-ovoj stranici, ne na Chronos stranici.** Chronos nikad ne vidi, ne prima i ne čuva broj kartice, CVC, ni datum isteka — to je namerno i tako Stripe Checkout (hostovana stranica, za razliku od Stripe Elements ugrađenih u naš UI) i treba da radi: PCI-DSS odgovornost za rukovanje podacima kartice ostaje na Stripe-u. `Payment` model u našoj bazi i dalje ima samo `Id`, `BookingId`, `Amount`, `Currency`, `Status`, `CreatedAtUtc` i sada `StripeSessionId` — potpuno namerno bez ijednog polja koje bi ličilo na podatke kartice.

Test kartice za sandbox (Stripe test mod, videti odeljak 6): broj `4242 4242 4242 4242`, bilo koji budući datum isteka, bilo koji 3-cifreni CVC, bilo koje ime — Stripe ovo prihvata kao "uspešno plaćanje" bez ikakve stvarne naplate.

Fokus rada ostaje Booking servis i progresivni rollout (Docker/K8s/Argo Rollouts), ne platni sistem — Stripe integracija je dodata da tok izgleda uverljivije za odbranu, ali ostaje u test modu (sandbox nalog, test API ključevi) kroz ceo rad.

## 5. Otvorena pitanja / poznata ograničenja ovog toka

- **`PaymentCompleted` event se gubi.** Payment-service ga "objavljuje", ali `IEventPublisher` implementacija (`DevelopmentEventPublisher`) samo piše u log — nema pravog RabbitMQ konektora za .NET servise (booking-service u Javi ga ima, ostali ne). Ako bi npr. notification-service trebalo da pošalje "uplata potvrđena" mejl, to danas ne bi radilo.
- **Payment-service veruje frontu za `amount`.** Ne postoji provera da poslata cena zaista odgovara ceni usluge u provider-service bazi — namerno pojednostavljenje iz istog razloga kao gore.
- **Nema povezivanja sa statusom rezervacije.** Kad se plaćanje završi, status same rezervacije (`Booking.status`) se ne menja automatski (ostaje npr. `CONFIRMED` kao i pre) — plaćanje i rezervacija su potpuno odvojeni zapisi u odvojenim bazama, povezani samo preko `bookingId`.
- **Nema refundacije pri otkazivanju.** `Payment` domenski model ima `Refund()` metodu, ali ništa je trenutno ne poziva — ako otkažeš plaćenu rezervaciju, plaćanje ostaje `Completed`.
- **Webhook zahteva `Stripe:WebhookSecret`.** Ako to polje u `appsettings.Development.json` ostane prazno, `POST /webhooks/stripe` vraća `503` umesto da prihvati neproveren poziv (vidi odeljak 6 kako se dolazi do te vrednosti lokalno).
- **EUR/RSD konverzija je fiksna, ne live kurs.** `RsdToEurRate = 117m` je ilustrativna konstanta u kodu, ne poziva se nikakav servis za kurs — dovoljno za demonstraciju toka, ne za stvarnu tačnost iznosa.

## 6. Lokalno testiranje Stripe webhook-a (Stripe CLI)

Stripe ne može da pošalje webhook na `http://localhost:8080` (nema pristup tvom računaru spolja), pa se lokalno koristi **Stripe CLI** koji napravi privremeni tunel i prosledi evente ka lokalnom payment-service-u.

1. Instaliraj Stripe CLI (uputstvo: `docs.stripe.com/stripe-cli`) i uloguj se komandom `stripe login` (otvara browser, poveži sa istim sandbox nalogom čiji su `sk_test_...`/`pk_test_...` ključevi u `appsettings.Development.json`).
2. Pokreni prosleđivanje ka gateway-u (ili direktno ka payment-service-u ako se testira izolovano):
   ```
   stripe listen --forward-to http://localhost:5000/api/v1/payments/webhooks/stripe
   ```
   (prilagodi port gateway-a/payment-service-a stvarnoj lokalnoj konfiguraciji).
3. Komanda ispiše `Ready! Your webhook signing secret is whsec_...` — tu vrednost upiši u `backend/services/payment-service/appsettings.Development.json`, polje `Stripe:WebhookSecret`, i restartuj payment-service.
4. Sad kad klikneš "Plati" u aplikaciji i završiš test plaćanje na Stripe stranici, `stripe listen` terminal će ispisati dolazni `checkout.session.completed` event i rezultat prosleđivanja (200 od našeg webhook-a).
5. Alternativa bez pravog UI toka: `stripe trigger checkout.session.completed` šalje sintetički test event (neće naći odgovarajući `Payment` u bazi jer `sessionId` neće postojati, pa će se samo ignorisati kroz `KeyNotFoundException` catch u kontroleru — korisno samo da se proveri da potpis prolazi).

Bez ovog koraka aplikacija i dalje radi (odeljak 3, korak 5 — potvrda pri povratku na `success_url` — pokriva glavni slučaj), webhook je samo dodatna sigurnosna mreža.
