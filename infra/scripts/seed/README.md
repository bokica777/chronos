# Demo seed podaci

Ovaj folder sadrži seed skripte za demo podatke (partneri, njihovi profili i
usluge) — odvojeno od podrazumevanih naloga/kategorija koje se automatski
seeduju iz koda i koje ovaj folder namerno ne dira.

## Šta se NE nalazi ovde (i zašto)

- **Admin nalog** (`admin@admin.com`) — automatski se kreira u
  `auth-service/Program.cs` (`SeedAdminAsync`) pri svakom pokretanju servisa
  ako `Users` tabela ne sadrži admina. Ne diramo tu logiku niti je
  duplira­mo ovde.
- **Podrazumevane kategorije** (Zdravlje, Lepota i nega, Fitnes i sport,
  Kućni majstori, Auto servisi, Edukacija) — automatski se kreiraju u
  `provider-service/Program.cs` (`SeedCategoriesAsync`) ako je `Categories`
  tabela prazna. Isto tako, ne diramo tu logiku.

## Šta se nalazi ovde

| Fajl | Svrha |
|---|---|
| `00-generate-provider-seed.sql` | Generator — čita trenutno stanje `Providers`/`Services` tabela i vraća gotov SQL tekst (red po red) koji se lepi u fajl ispod. Ne menja bazu. |
| `01-providers-and-services.sql` | Finalni, verzionisani seed — `INSERT` naredbe za 8 demo partnera i njihove usluge. Ovo je fajl koji se komituje u repo i deli sa drugima. |

## Postupak (jednom, nakon što su partnerski podaci ručno uneti kroz UI)

1. Otvori `00-generate-provider-seed.sql` u VS Code (mssql ekstenzija) ili
   SSMS-u, poveži se na `ProviderDb`, pokreni skript.
2. Rezultat je jedna kolona (`Line`) sa više redova teksta. Selektuj sve
   redove u rezultatu, kopiraj ih.
3. Zalepi u `01-providers-and-services.sql`, zamenjujući placeholder sadržaj.
4. Komituj `01-providers-and-services.sql` u repo.

## Kako neko drugi (npr. komisija) puni bazu od nule

Preduslov: svi servisi su pokrenuti bar jednom (auto-migracija + auto-seed
admina/kategorija su se izvršili), i partnerski nalozi iz
`01-providers-and-services.sql` (email adrese partnera) su registrovani kroz
`/register` (ili ubačeni direktno u `AuthDb.Users`).

Zatim samo pokreni `01-providers-and-services.sql` nad `ProviderDb` — skript
sam pronalazi `OwnerId` (po email-u iz `AuthDb`) i `CategoryId` (po nazivu
kategorije), pa radi bez obzira na to koji su tačno GUID-ovi generisani pri
tom pokretanju.
