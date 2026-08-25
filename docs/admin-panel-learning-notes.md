# Admin panel — šta je urađeno i zašto (za prezentaciju)

Ovaj dokument objašnjava sve što je dodato u ovoj rundi rada: admin panel koji pokriva
korisnike, kategorije, provajdere, usluge i pregled rezervacija. Cilj je da razumeš
**svaku promenu** dovoljno dobro da je objasniš mentoru — ne samo *šta* je dodato, nego
*zašto* je dizajnirano baš tako.

Test nalog za admina (već postoji u bazi, seeduje se automatski pri startu auth-service-a):

```
email: admin@admin.com
lozinka: admin
```

Nema nijedne nove EF/Flyway migracije u ovoj rundi — sva `IsActive` polja i
`Activate()`/`Deactivate()` metode su već postojale od ranije (korišćene za
samo-uslužno gašenje vidljivosti profila/usluga), samo su sad dostupne i adminu.

---

## 1. Ideja u pozadini: "soft delete" umesto brisanja

Kroz ceo admin panel se ponavlja isti obrazac: **ništa se ne briše iz baze**, samo se
gasi/pali `IsActive` (ili `Role`/`IsActive` kod korisnika). Zašto:

- Provider ima Services, Booking ima strane ključeve ka Provider/Service/User preko
  ID-jeva razbacanih po 3 različite baze (svaki mikroservis ima svoju bazu). Da smo
  obrisali npr. provajdera, sve njegove rezervacije bi ostale sa "mrtvim" `providerId`
  koji ništa više ne pokazuje — nema referencijalnog integriteta preko granica servisa.
- Deaktivacija je reverzibilna (admin je pogrešio, samo vrati). Brisanje nije.
- Ovo je isti obrazac koji smo već ranije koristili za partnera koji gasi svoj profil
  (`PATCH /providers/me/visibility`) — admin panel ga samo generalizuje: umesto
  "sopstveni resurs", admin cilja **bilo koji** resurs.

---

## 2. auth-service — upravljanje korisnicima

### Šta je dodato

**`Domain/User.cs`** — `User` je već imao `IsActive` polje, ali nijedna metoda ga
nije menjala (mrtav kod). Dodate su dve metode:

```csharp
public void SetRole(UserRole role) => Role = role;
public void SetActive(bool isActive) => IsActive = isActive;
```

**`Application/IUserRepository.cs`** + **`Infrastructure/AuthDbContext.cs`** — dodat
`GetAllAsync()` (lista svih korisnika, sortirano po datumu registracije). Pre ovoga
repozitorijum je znao samo da nađe JEDNOG korisnika (po ID-ju ili emailu) — logično,
jer je do sad postojao samo login/register.

**`Contracts/UserContracts.cs`** — `UserResponse` je proširen sa `IsActive` i
`CreatedAtUtc` (ranije je vraćao samo Id/Email/DisplayName/Role). Dodata su i dva nova
DTO-a: `UpdateUserRoleRequest(UserRole Role)` i `UpdateUserActiveRequest(bool IsActive)`.

**`Application/AuthServiceImpl.cs`** — tri nove metode: `GetAllUsersAsync`,
`UpdateUserRoleAsync`, `SetUserActiveAsync`. Bitna izmena u `LoginAsync`:

```csharp
if (!user.IsActive)
{
    throw new UnauthorizedAccessException("This account has been deactivated.");
}
```

Bez ovoga, deaktivacija naloga preko admin panela ne bi ništa realno sprečavala —
korisnik bi i dalje mogao da se uloguje kao da se ništa nije desilo.

**`Api/UsersController.cs`** (nov fajl) — ruta `api/v1/auth/users`,
`[Authorize(Roles = "Admin")]` na nivou cele klase (znači: baš nijedna akcija u ovom
kontroleru nije dostupna bez admin tokena):

- `GET /api/v1/auth/users` — lista svih korisnika
- `PATCH /api/v1/auth/users/{id}/role` — promena role
- `PATCH /api/v1/auth/users/{id}/active` — aktivacija/deaktivacija

**Zaštita od "pucanja sebi u nogu"** — obe PATCH akcije prvo proveravaju
`id == GetCurrentUserId()` i vraćaju 400 ako admin pokušava da promeni **svoju**
rolu ili se deaktivira. Bez ovoga bi admin mogao slučajno da sebi oduzme Admin
rolu ili da se zaključa van svog naloga, bez ikog drugog ko bi to mogao da vrati
(nema UI za direktnu izmenu baze).

Zašto nema `DELETE /users/{id}` — namerno. Isti razlog kao "soft delete" princip
gore: brisanje bi ostavilo rezervacije/provajdere sa "mrtvim" `customerId`/`ownerId`.

---

## 3. provider-service — kategorije, provajderi, usluge

Ovde je bilo najviše posla jer se moderacija dodaje na **tri** različita resursa, i
svaki već ima svoj postojeći "samo-uslužni" put koji nismo smeli da pokvarimo.

### Kategorije

Kategorije su već imale `Activate()`/`Deactivate()` na domenu (`Domain/Category.cs`)
i `[Authorize(Roles = "Admin")]` na Create/Update — ali:
- javna lista (`GET /api/v1/categories`) **filtrira** `IsActive == true`, pa admin
  ne bi video deaktivirane kategorije da bi ih vratio.
- nije postojao endpoint da se `IsActive` uopšte promeni (samo Create/Update, koji
  ne diraju to polje).

Dodato:
- `ICategoryRepository.GetAllCategoriesForAdminAsync()` — ista tabela, ali BEZ
  `.Where(x => x.IsActive)` filtera.
- `ICategoryService.SetCategoryVisibilityAsync(id, isVisible)` — poziva postojeće
  `category.Activate()`/`Deactivate()`.
- `GET /api/v1/categories/admin` i `PATCH /api/v1/categories/{id}/visibility`
  (oba `[Authorize(Roles = "Admin")]`) u `CategoryController.cs`.

### Provajderi

`GET /api/v1/providers` (javna lista) **takođe filtrira** `IsActive == true` — bitno
otkriće tokom analize, jer sam prvo mislio da je već neuslovljena. Partner ima
`PATCH /providers/me/visibility` za **sopstveni** profil, ali ništa nije postojalo
za admina da to uradi nekom **drugom** partneru.

Dodato (isti obrazac kao kategorije):
- `IProviderRepository.GetAllForAdminAsync()` — sve, uključujući neaktivne.
- `IProviderService.GetAllProvidersForAdminAsync()` +
  `SetProviderVisibilityForAdminAsync(providerId, isVisible)`.
- `GET /api/v1/providers/admin` i `PATCH /api/v1/providers/{id}/visibility` u
  `ProviderController.cs`.

Ruta `PATCH /api/v1/providers/{id:guid}/visibility` (admin, bilo koji provajder) i
`PATCH /api/v1/providers/me/visibility` (partner, samo svoj) mirno koegzistiraju —
ASP.NET routing razlikuje literal `"me"` od `{id:guid}` parametra bez ikakve
dvosmislenosti (isti trik se već koristi za `GET /providers/{id}` naspram
`GET /providers/me`).

### Usluge

Usluge su potpuno "samo-uslužne" — ceo `ServiceController.cs` je
`[Authorize(Roles = "Partner")]` na nivou klase i sve radi kroz `/providers/me/services`,
razrešavajući `providerId` isključivo iz JWT-a ulogovanog partnera. Ubacivanje admin
akcije u taj kontroler bi značilo probijanje te pretpostavke (bio bi to jedini
endpoint u kontroleru koji ne pripada ulogovanom partneru).

Zato je admin moderacija usluga dodata u **`PublicServicesController.cs`** (koji već
postoji za javnu "pijacu usluga", bez auth) umesto u `ServiceController.cs`:

```csharp
[Authorize(Roles = "Admin")]
[HttpGet("admin")]
public async Task<ActionResult<List<ServiceResponse>>> GetAllForAdmin(...)

[Authorize(Roles = "Admin")]
[HttpPatch("{id:guid}/visibility")]
public async Task<ActionResult<ServiceResponse>> SetVisibilityForAdmin(Guid id, SetVisibilityRequest request, ...)
```

Dodata `IServiceRepository.GetAllServicesForAdminAsync()` — obična
`Services.ToListAsync()` bez ikakvog filtera (za razliku od
`GetAllActivePublicServicesAsync()`, koji radi JOIN sa Providers i filtrira i
`service.IsActive` i `provider.IsActive`).

---

## 4. booking-service — pregled svih rezervacija (i najzanimljiviji deo za mentora)

Ovo je jedini deo admin panela koji dira Spring Security, pa zaslužuje detaljnije
objašnjenje.

### Problem

Booking-service od ranije (prošle runde) proverava JWT nezavisno (isti HMAC ključ kao
auth-service), ali **samo proverava da li je token validan** — nema pojma o ulogama.
`SecurityConfig.java` je imao samo:

```java
.anyRequest().authenticated()
```

Za nov endpoint `GET /api/v1/bookings/admin/all` trebalo je: "mora biti ulogovan
**i** mora biti Admin". Dve opcije:

1. Ručna provera unutar kontrolera (`if (!role.equals("Admin")) throw ...`).
2. "Prava" Spring Security deklarativna zaštita: `.hasRole("Admin")` na nivou rute.

Izabrana je opcija 2 — konzistentnije je sa ostatkom `SecurityConfig.java`
(sve ostalo je već deklarativno kroz `authorizeHttpRequests`), i to je standardni
Spring Security obrazac koji bi mentor odmah prepoznao.

### Komplikacija: gde je uopšte rola u tokenu?

Ovde je bio suptilan detalj otkriven analizom `JwtTokenGenerator.cs` (auth-service):
kada se token generiše, `Claim` za rolu se pravi ovako:

```csharp
new Claim(ClaimTypes.Role, role.ToString())
```

`ClaimTypes.Role` NIJE kratak string `"role"` — to je puna URI konstanta:
`http://schemas.microsoft.com/ws/2008/06/identity/claims/role`. Pošto se token
gradi direktno preko `new JwtSecurityToken(claims: ...)` (bez ASP.NET-ovog
"outbound claim mapping" mehanizma), taj dugački URI se **doslovno** upiše kao
JSON ključ u payload tokena. To je nevidljivo iz .NET sveta (ASP.NET pri
**čitanju** tokena automatski radi obrnuto mapiranje), ali Spring/Nimbus na Java
strani nema pojma o toj ASP.NET konvenciji — čita klejmove tačno onako kako pišu
u JSON-u.

Zaključak: da bi Spring video rolu, mora da čita baš taj dugački URI ključ, ne
`"role"`.

### Rešenje — `JwtAuthenticationConverter`

```java
private static final String ROLE_CLAIM =
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

private Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
    return jwt -> {
        String role = jwt.getClaimAsString(ROLE_CLAIM);
        Collection<GrantedAuthority> authorities = role == null
                ? List.of()
                : List.of(new SimpleGrantedAuthority("ROLE_" + role));
        return new JwtAuthenticationToken(jwt, authorities);
    };
}
```

Ovo je "prevodilac" koji se ubacuje u `oauth2ResourceServer` konfiguraciju:

```java
.oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt
        .decoder(jwtDecoder)
        .jwtAuthenticationConverter(jwtAuthenticationConverter())
));
```

Kad token stigne, Spring Security ovim converter-om pretvara sirovi klejm
(`"...role": "Admin"`) u `GrantedAuthority` objekat `"ROLE_Admin"` — Spring
Security **po konvenciji** očekuje prefiks `"ROLE_"` da bi `.hasRole("Admin")`
uopšte radio (`hasRole("Admin")` je samo skraćenica za
`hasAuthority("ROLE_Admin")`).

Onda u `authorizeHttpRequests`:

```java
.requestMatchers("/api/v1/bookings/admin/**").hasRole("Admin")
```

Ovo mora biti definisano **pre** generalnog `.anyRequest().authenticated()` reda —
Spring Security proverava pravila odozgo nadole i staje na prvom koje se poklopi
sa putanjom, pa specifičnija pravila uvek idu iznad opštijih.

### Sam endpoint

```java
// BookingController.java
@GetMapping("/admin/all")
public List<BookingResponse> listAllForAdmin() {
    List<Booking> bookings = bookingService.listAll();
    ...
}
```

`bookingService.listAll()` samo zove `bookingRepository.findAll()` — metoda koju
Spring Data JPA već daje besplatno kroz `JpaRepository<Booking, UUID>` (nije trebalo
pisati nikakav novi upit).

---

## 5. Frontend

### `services/adminService.ts` (nov fajl)

Sve admin pozive grupiše na jedno mesto, po resursu (`users`, `categories`,
`providers`, `services`, `bookings`), svaki sa `getAll` + odgovarajući
`setVisibility`/`updateRole`/`setActive`. Sve prolazi kroz postojeći `httpClient`
koji već automatski kači `Authorization: Bearer <token>` na svaki zahtev (isti
mehanizam koji koriste sve ostale stranice) — nije trebalo ništa dodatno za slanje
tokena.

### `pages/admin/AdminPage.tsx` + `pages/admin/tabs/*.tsx`

- `AdminPage.tsx` je "školjka": proverava `user.role === "Admin"` (ako nije, prikaže
  "Nemaš pristup" — ovo je frontend zaštita radi UX-a, **stvarna** zaštita je
  `[Authorize(Roles = "Admin")]` na backendu, jer frontend guard sam po sebi ne
  sprečava nikog ko zna URL API-ja).
- Pet tabova, svaki svoj fajl (`AdminUsersTab`, `AdminCategoriesTab`,
  `AdminProvidersTab`, `AdminServicesTab`, `AdminBookingsTab`) — svaki nezavisno
  učitava svoje podatke kad se prikaže.
- Gornja traka sa brojkama (broj korisnika/kategorija/provajdera/usluga/rezervacija)
  učitava se jednom pri otvaranju stranice, nezavisno od tabova — čisto kozmetički
  dodatak za "osećaj" pravog admin panela.

### Ponovna upotreba postojećeg dizajna

Namerno nije pisana nijedna nova "kartica"/"lista" komponenta — svuda se koriste već
postojeće klase iz `ManageServicesPage` (`.service-manage-list`, `.service-manage-row`,
`.service-manage-info`, `.service-manage-actions`) i `.visibility-badge--visible/hidden`
(zeleno/crveno, već definisano za profil vidljivost). Dodato je samo ono što stvarno
nije postojalo: `.admin-tabs`/`.admin-tab-button` (tab prekidač) i
`.admin-stats-row`/`.admin-stat-card` (brojke na vrhu).

### Navigacija

`Navigation.tsx` je ranije imao `if/else` koji je Client i Admin gurao u isti
("Moje rezervacije") granu — sad je pravo 3-grano grananje po roli
(`Partner` → Menadžer usluga, `Client` → Moje rezervacije, `Admin` → Admin panel),
plus nova stavka `routes.admin = "/admin"` dodata u `routes.ts` i `AppRouter.tsx`.

---

## 6. Kako to isprobati

1. Uloguj se kao `admin@admin.com` / `admin` (ovaj nalog se automatski seeduje pri
   startu auth-service-a, `Program.cs` → `SeedAdminAsync`).
2. U meniju se pojavljuje "Admin panel" (samo za ovu rolu).
3. Na `/admin`: Korisnici (menjaj rolu/status bilo kog naloga osim svog), Kategorije
   (dodaj/izmeni/sakrij), Provajderi i Usluge (sakrij/prikaži), Rezervacije
   (read-only pregled svega).

## 7. Šta bi mogao da dodaš posle (ako mentor pita "šta dalje")

- Trenutno `PATCH .../visibility` vraća 404 (ne 403) kad resurs ne postoji — isti
  obrazac kao ostatak projekta, ali admin akcije koje NE postoje (npr. brisanje
  korisnika) namerno nisu dodate iz razloga objašnjenih u sekciji 1.
- `GET /api/v1/bookings/provider/{id}` je i dalje potpuno javan (bez ikakve role
  provere) — namerno, jer gost mora da vidi kalendar dostupnosti bez prijave. Ovo je
  već ranije identifikovano kao mala rupa (vraća i tuđi `customerId`), nije dirano
  u ovoj rundi.
- Admin panel nema paginaciju — za pravu produkciju sa hiljadama korisnika bi
  trebalo, za diplomski/demo obim nije potrebno.
