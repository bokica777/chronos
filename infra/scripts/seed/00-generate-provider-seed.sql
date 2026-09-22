-- =============================================================================
-- Generator: ne menja bazu, samo CITA vec unete podatke o partnerima i vraca
-- rezultat kao listu redova teksta - svaki red je jedna linija gotovog,
-- portabilnog INSERT skripta (01-providers-and-services.sql).
--
-- Zasto generator a ne rucno pisan fajl:
--   Partnerski nalozi i njihovi profili/usluge su rucno uneti kroz aplikaciju
--   (UI forme), pa je ovo najpouzdaniji nacin da se tacno ono sto je uneto
--   izvuce u seed fajl, bez prepisivanja "na oko".
--
-- Kako se koristi:
--   1. Pokreni ovaj skript nad ProviderDb.
--   2. Rezultat je JEDNA kolona (Line) sa puno redova - selektuj sve redove
--      u rezultatu (Ctrl+A), kopiraj (Ctrl+C).
--   3. Zalepi u fajl 01-providers-and-services.sql (zameni trenutni
--      placeholder sadrzaj u celosti), po jedan red teksta = jedan red fajla.
--   4. Commit 01-providers-and-services.sql u repo - to je finalni,
--      reproduktivni seed koji bilo ko moze da pokrene na svezoj bazi.
--
-- Namerno je izlaz "red po red" (a ne jedan veliki PRINT string) da se
-- izbegne odsecanje dugackog teksta kod pojedinih SQL klijenata.
--
-- NAPOMENA: Ovaj generator NISTA ne dira u vezi admin naloga ili
-- podrazumevanih kategorija (Zdravlje, Lepota i nega, Fitnes i sport,
-- Kucni majstori, Auto servisi, Edukacija) - te se i dalje automatski
-- seeduju iz Program.cs (SeedAdminAsync / SeedCategoriesAsync) i njih
-- namerno ne diramo.
-- =============================================================================

SET NOCOUNT ON;

;WITH Header AS (
    SELECT 1 AS Sort, N'-- =============================================================================' AS Line
    UNION ALL SELECT 2, N'-- Demo seed: partnerski profili i usluge (generisano iz stvarnih podataka).'
    UNION ALL SELECT 3, N'-- Generisano: ' + CONVERT(NVARCHAR(19), SYSUTCDATETIME(), 120) + N' UTC'
    UNION ALL SELECT 4, N'--'
    UNION ALL SELECT 5, N'-- Pretpostavke pre pokretanja ovog fajla:'
    UNION ALL SELECT 6, N'--   1) auth-service je vec pokrenut bar jednom i partnerski nalozi (Email'
    UNION ALL SELECT 7, N'--      ispod) su registrovani.'
    UNION ALL SELECT 8, N'--   2) provider-service je vec pokrenut bar jednom (Categories tabela je'
    UNION ALL SELECT 9, N'--      auto-seedovana podrazumevanim kategorijama).'
    UNION ALL SELECT 10, N'--   3) Pokrece se nad ProviderDb.'
    UNION ALL SELECT 11, N'-- ============================================================================='
    UNION ALL SELECT 12, N''
    UNION ALL SELECT 13, N'-- ---------------------------------------------------------------------------'
    UNION ALL SELECT 14, N'-- Providers'
    UNION ALL SELECT 15, N'-- OwnerId se namerno ne upisuje kao literal GUID vec kao SELECT po Email-u,'
    UNION ALL SELECT 16, N'-- da bi skript ostao ispravan i na svezoj bazi gde Users.Id nije isti.'
    UNION ALL SELECT 17, N'-- ---------------------------------------------------------------------------'
),
ProviderLines AS (
    SELECT
        20 AS Sort,
        p.Name AS SortKey,
        1 AS SubSort,
        N'INSERT INTO Providers (Id, OwnerId, Name, Description, AboutUs, ImageUrl, Address, Latitude, Longitude, ContactPhone, ContactEmail, WorkingHoursStart, WorkingHoursEnd, IsActive)' AS Line
    FROM Providers p
    UNION ALL
    SELECT
        20,
        p.Name,
        2,
        N'VALUES (' +
            N'''' + CONVERT(NVARCHAR(36), p.Id) + N''', ' +
            N'(SELECT Id FROM AuthDb.dbo.Users WHERE Email = N''' + REPLACE(u.Email, '''', '''''') + N'''), ' +
            N'N''' + REPLACE(p.Name, '''', '''''') + N''', ' +
            ISNULL(N'N''' + REPLACE(p.Description, '''', '''''') + N'''', N'NULL') + N', ' +
            ISNULL(N'N''' + REPLACE(p.AboutUs, '''', '''''') + N'''', N'NULL') + N', ' +
            ISNULL(N'N''' + REPLACE(p.ImageUrl, '''', '''''') + N'''', N'NULL') + N', ' +
            ISNULL(N'N''' + REPLACE(p.Address, '''', '''''') + N'''', N'NULL') + N', ' +
            ISNULL(CONVERT(NVARCHAR(30), p.Latitude), N'NULL') + N', ' +
            ISNULL(CONVERT(NVARCHAR(30), p.Longitude), N'NULL') + N', ' +
            ISNULL(N'N''' + REPLACE(p.ContactPhone, '''', '''''') + N'''', N'NULL') + N', ' +
            ISNULL(N'N''' + REPLACE(p.ContactEmail, '''', '''''') + N'''', N'NULL') + N', ' +
            ISNULL(N'N''' + REPLACE(p.WorkingHoursStart, '''', '''''') + N'''', N'NULL') + N', ' +
            ISNULL(N'N''' + REPLACE(p.WorkingHoursEnd, '''', '''''') + N'''', N'NULL') + N', ' +
            CASE WHEN p.IsActive = 1 THEN N'1' ELSE N'0' END +
        N');'
    FROM Providers p
    INNER JOIN AuthDb.dbo.Users u ON u.Id = p.OwnerId
),
Middle AS (
    SELECT 1 AS Sort, N'' AS Line
    UNION ALL SELECT 2, N'-- ---------------------------------------------------------------------------'
    UNION ALL SELECT 3, N'-- Services'
    UNION ALL SELECT 4, N'-- CategoryId se namerno ne upisuje kao literal GUID vec kao SELECT po Name-u'
    UNION ALL SELECT 5, N'-- (podrazumevane kategorije dobijaju nov GUID pri svakom auto-seedu).'
    UNION ALL SELECT 6, N'-- ProviderId JESTE literal GUID jer se poklapa sa literalom iz bloka iznad.'
    UNION ALL SELECT 7, N'-- ---------------------------------------------------------------------------'
),
ServiceLines AS (
    SELECT
        40 AS Sort,
        p.Name AS ProviderSortKey,
        s.Name AS SortKey,
        1 AS SubSort,
        N'INSERT INTO Services (Id, ProviderId, CategoryId, Name, Description, Note, ImageUrl, DurationMinutes, Price, IsActive)' AS Line
    FROM Services s
    INNER JOIN Providers p ON p.Id = s.ProviderId
    UNION ALL
    SELECT
        40,
        p.Name,
        s.Name,
        2,
        N'VALUES (' +
            N'''' + CONVERT(NVARCHAR(36), s.Id) + N''', ' +
            N'''' + CONVERT(NVARCHAR(36), s.ProviderId) + N''', ' +
            N'(SELECT Id FROM Categories WHERE Name = N''' + REPLACE(c.Name, '''', '''''') + N'''), ' +
            N'N''' + REPLACE(s.Name, '''', '''''') + N''', ' +
            ISNULL(N'N''' + REPLACE(s.Description, '''', '''''') + N'''', N'NULL') + N', ' +
            ISNULL(N'N''' + REPLACE(s.Note, '''', '''''') + N'''', N'NULL') + N', ' +
            ISNULL(N'N''' + REPLACE(s.ImageUrl, '''', '''''') + N'''', N'NULL') + N', ' +
            CONVERT(NVARCHAR(10), s.DurationMinutes) + N', ' +
            CONVERT(NVARCHAR(20), s.Price) + N', ' +
            CASE WHEN s.IsActive = 1 THEN N'1' ELSE N'0' END +
        N');'
    FROM Services s
    INNER JOIN Providers p ON p.Id = s.ProviderId
    INNER JOIN Categories c ON c.Id = s.CategoryId
)
SELECT Line FROM (
    SELECT Sort, N'' AS SortKey, 0 AS SubSort, Line FROM Header
    UNION ALL
    SELECT Sort, SortKey, SubSort, Line FROM ProviderLines
    UNION ALL
    SELECT Sort, N'' AS SortKey, 0 AS SubSort, Line FROM Middle
    UNION ALL
    SELECT Sort, ProviderSortKey + N'~' + SortKey, SubSort, Line FROM ServiceLines
) AS combined
ORDER BY Sort, SortKey, SubSort;
