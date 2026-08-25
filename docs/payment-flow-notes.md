# Kako radi "Simuliraj plaćanje" — detaljan tok komunikacije

Ovaj dokument objašnjava tačno šta se dešava, korak po korak, kada korisnik na stranici "Moje rezervacije" klikne dugme "Simuliraj plaćanje" — koji servisi se pozivaju, šta se šalje, šta se čuva u bazi, i zašto trenutno ne postoji nijedno polje za unos podataka.

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

## 3. Šta se dešava kad klikneš dugme

Klik pokreće **dva uzastopna HTTP poziva** ka payment-service-u, jedan za drugim, iz iste funkcije na frontu (`handlePay` u `BookingsPage.tsx`):

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

## 4. Zašto ne postoji nijedno polje za unos (broj kartice, itd.)

Ovo je verovatno tvoje pravo pitanje, pa evo direktnog odgovora: **trenutno nema gde da ti podaci ni stignu.** `Payment` model u bazi ima samo `Id`, `BookingId`, `Amount`, `Currency`, `Status` i vremenske pečate — nema polja za broj kartice, ime na kartici, CVV, ili bilo šta slično. Čak i kad bi front prikazao formu i ti upisao broj kartice, taj podatak bi morao negde da se pošalje i nešto da ga proveri — a mi nemamo (i ne planiramo) pravog platnog provajdera (Stripe, WSPay, PayU...) iza ovoga, jer to nije tema diplomskog rada. "Simulacija" ovde doslovno znači: klik odmah uspe, uvek, bez ikakve spoljne provere.

To je svesna pojednostavljivanje, ne previd — slično kao što `DevelopmentEventPublisher` samo loguje evente umesto da ih šalje na pravi broker. Fokus rada je Booking servis i progresivni rollout (Docker/K8s/Argo Rollouts), a ne platni sistem, pa smo payment tok namerno sveli na minimum koji dokazuje da servisi mogu da sarađuju.

**Ako želiš da izgleda uverljivije za odbranu** (npr. da se otvori mala forma sa "brojem kartice" i imenom pre nego što se pozovu ova dva API poziva), to je moguće dodati kao čisto kozmetičku frontend promenu — backend se ne bi menjao, jer mu ti podaci i dalje ne bi bili potrebni (samo bi se prikazala forma, pa nakon "Potvrdi" pozvao isti tok koji već postoji). Javi mi ako to želiš, pa ću dodati.

## 5. Otvorena pitanja / poznata ograničenja ovog toka

- **`PaymentCompleted` event se gubi.** Payment-service ga "objavljuje", ali `IEventPublisher` implementacija (`DevelopmentEventPublisher`) samo piše u log — nema pravog RabbitMQ konektora za .NET servise (booking-service u Javi ga ima, ostali ne). Ako bi npr. notification-service trebalo da pošalje "uplata potvrđena" mejl, to danas ne bi radilo.
- **Payment-service veruje frontu za `amount`.** Ne postoji provera da poslata cena zaista odgovara ceni usluge u provider-service bazi — namerno pojednostavljenje iz istog razloga kao gore.
- **Nema povezivanja sa statusom rezervacije.** Kad se plaćanje završi, status same rezervacije (`Booking.status`) se ne menja automatski (ostaje npr. `CONFIRMED` kao i pre) — plaćanje i rezervacija su potpuno odvojeni zapisi u odvojenim bazama, povezani samo preko `bookingId`.
- **Nema refundacije pri otkazivanju.** `Payment` domenski model ima `Refund()` metodu, ali ništa je trenutno ne poziva — ako otkažeš plaćenu rezervaciju, plaćanje ostaje `Completed`.
