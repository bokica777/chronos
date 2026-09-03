# Plan: Kubernetes, Argo Rollouts, observability, CI/CD

Datum: 03.09.2026.

Ovo je plan za ono što specifikacija označava kao suštinu diplomskog rada, a
što je posle Docker faze (`docs/docker-i-v2-izvestaj.md`) i dalje na 0%:
Kubernetes, Argo Rollouts, observability, CI/CD. Doneo sam konkretne odluke za
svaku razgranatu tačku (obrazložene niže i formalizovane kao ADR-ovi u
`docs/decisions/README.md`) umesto da ostavim otvorena pitanja — cilj je da
ovo bude spremno za direktno izvršavanje, bez čekanja na dalje odlučivanje.

## 0. Princip vođenja odluka

Vreme je ograničeno (rekao si da nemaš vremena da sam radiš ovaj deo), pa je
svaka odluka niže napravljena sa pitanjem: **"da li ovo direktno služi
demonstraciji progresivnog rollout-a (tema rada), ili je to samo 'lepo imati'
infrastrukturni ukras?"** Gde je odgovor "ukras", eksplicitno sam to skratio
ili izbacio (npr. bez servisnog meša, bez GitOps-a, bez distribuiranog
tracing-a) i to je zapisano kao svesna odluka, ne kao propust.

## 1. Faza A — Kubernetes osnove

### 1.1 Lokalni klaster: `kind`

Već je bilo predloženo u `docs/decisions/README.md` (stub) — potvrđujem kao
odluku. `kind` (Kubernetes IN Docker) radi na vrhu Docker Desktop-a koji već
imaš instaliran, ima zvaničan recept za `ingress-nginx` preko
`extraPortMappings`, i lako se automatizuje/dokumentuje preko jednog
`kind-config.yaml` fajla u repou (reproduktivno na bilo kojoj mašini pri
odbrani rada). Minikube/k3d bi radili podjednako dobro, ali `kind` je
najrasprostranjeniji izbor tačno za ovaj slučaj (lokalni demo, jedan node).

### 1.2 Jedan namespace: `chronos`

Bez odvajanja po environment-ima (dev/staging/prod) — ovo je demo za jedan
klaster koji se pokreće lokalno pred odbranu, ne realan multi-env sistem.
Sav infra (SQL Server, RabbitMQ) i svi servisi idu u `chronos` namespace,
osim samog Argo Rollouts kontrolera koji po zvaničnoj konvenciji ide u svoj
`argo-rollouts` namespace (cluster-wide kontroler, ne aplikativna komponenta).

### 1.3 Baza podataka i RabbitMQ u klasteru — namerno pojednostavljeno

**Odluka: obični `Deployment` (1 replika) + `emptyDir` ili osnovni PVC, NE
`StatefulSet`.** SQL Server i RabbitMQ ovde postoje da bi aplikacija radila
tokom demoa, ne da bi se demonstrirala otpornost baze na restart pod-a — to
nije tema rada. `StatefulSet` + pravi storage provisioner bi bio realniji za
produkciju, ali bi trošio vreme bez ikakve koristi za odbranu teze. Ako pod
restartuje tokom demoa, gubi se stanje — prihvatljivo, jer se demo i onako
pokreće sveže (isto kao `docker-compose down -v` pre svakog pokretanja).

### 1.4 ConfigMap/Secret strategija

- `ConfigMap` po servisu (ili jedan zajednički) za ne-tajne vrednosti (URL-ovi
  drugih servisa, `booking.version`, itd.) — mapira se na Deployment-ove
  environment promenljive, isti obrazac kao `environment:` u
  `docker-compose.yaml`, samo kroz `envFrom`/`valueFrom.configMapKeyRef`.
- `Secret` (plain, base64 — NE sealed-secrets/SOPS/Vault) za connection
  stringove i Stripe ključeve. Isto obrazloženje kao za Docker fazu: Stripe
  ključevi su već test-mode i već javno vidljivi u repo istoriji, pa
  enkriptovano upravljanje tajnama ovde ne brani ništa stvarno — samo dodaje
  alat koji nije tema rada. Ako profesor pita "a šta sa pravim tajnama u
  produkciji" — to je tačno mesto da se pomene sealed-secrets/External
  Secrets Operator kao poznato proširenje, bez da se stvarno implementira.

### 1.5 Manifesti po servisu

Za svaki od auth/provider/payment/notification/gateway/frontend:
`Deployment` (1 replika, `livenessProbe`/`readinessProbe` na `/health/live` i
`/health/ready` za .NET servise — **ovi endpoint-i već postoje**,
`ObservabilityExtensions.cs` ih je odavno mapirao, zero dodatnog rada; za
Java servise Spring Boot Actuator već izlaže `/actuator/health` istom
logikom) + `Service` (ClusterIP). Booking-service je izuzetak — ide direktno
kao Argo Rollouts `Rollout` resurs, ne kao `Deployment` (Faza B).

### 1.6 Spoljni pristup: Ingress (ne NodePort)

`ingress-nginx` preko `kind`-ovog zvaničnog recepta (`extraPortMappings` na
80/443 u `kind-config.yaml`), sa dve rute: `/` → `frontend` Service, `/api` →
`gateway` Service. Odluka u odnosu na alternativu (`kubectl port-forward` ili
`NodePort`): Ingress daje jedan stabilan URL (`http://chronos.local`) za ceo
demo umesto žongliranja sa više portova u terminalu — jeftino se postavlja
(jedan YAML), a čini demo vizuelno čistijim pred komisijom. Ovo je ipak
**poliranje, ne prioritet** — dolazi POSLE Faze B (vidi redosled u sekciji 5).

## 2. Faza B — Argo Rollouts (srž rada)

### 2.1 Instalacija kontrolera

`kubectl apply -n argo-rollouts -f <pinovan release manifest>` (ne Helm) —
jedan manje alat za instalirati/objašnjavati, i tačno prati zvaničnu
"Getting started" dokumentaciju projekta koju ćeš verovatno citirati u radu.
Dodaje se i `kubectl-argo-rollouts` CLI plugin — njegov `get rollout --watch`
prikaz (živa ASCII vizualizacija canary koraka i procenta) je najbolji
pojedinačni "wow" momenat za odbranu, vredi ga instalirati eksplicitno.

### 2.2 Strategija: canary (ne blue-green)

Već nagovešteno u postojećoj dokumentaciji ("canary koraci 10 -> 50 -> 100").
Canary je i pedagoški bogatiji za temu "progresivni rollout" — blue-green je
trenutni prekidač bez postepenosti, ne demonstrira isto.

### 2.3 Traffic split: "basic canary" preko odnosa replika, BEZ traffic-router plugina

Ovo je najvažnija tehnička odluka u ovoj fazi. Argo Rollouts ima dva režima:

1. **Basic canary** — bez ikakvog dodatnog alata, Argo Rollouts kontroliše
   broj replika stabilne i canary verzije ispod ISTOG Service-a; pošto K8s
   Service round-robin balansira između svih matching pod-ova, odnos
   replika ≈ odnos saobraćaja (npr. 10% na 10 ukupnih replika = 1 canary pod).
2. **Traffic-managed canary** — precizan % preko traffic-router plugina
   (Istio, Nginx Ingress canary anotacije, SMI, Gateway API...) — tačan
   procenat bez obzira na broj replika, ali zahteva dodatni infra sloj.

**Odluka: basic canary**, bez traffic-router plugina. Instaliranje i
objašnjavanje Istio-a (ili slično) bi bio nesrazmerno veliki dodatni posao za
ono što donosi — osnovni mehanizam (postepeno povećanje težine, automatska
analiza, automatski rollback) je identičan i podjednako validan predmet
demonstracije i bez preciznog % rutiranja. Ograničenje (da je % samo
približan pri malom broju replika) je nešto što treba pomenuti kao poznatu
osobinu u samom radu, ne sakriti.

### 2.4 Koraci canary-a

```yaml
strategy:
  canary:
    steps:
      - setWeight: 10
      - pause: {}              # čeka AnalysisRun ili ručnu potvrdu
      - setWeight: 50
      - pause: {}
      - setWeight: 100
```
Prvi prolaz kroz demo: ručna promocija (`kubectl argo rollouts promote`) da
se vidi mehanika. Finalna verzija demoa: `pause` vezan za `AnalysisTemplate`
tako da se promocija/rollback dešava automatski (sledeća tačka) — ovo
direktno ispunjava već postojeću napomenu u `docs/architecture/README.md`
("neuspešna analiza automatski prekida promociju").

### 2.5 AnalysisTemplate — koja metrika i zašto baš ta

Metrika: **stopa 5xx grešaka na booking-service-u** (`http_server_requests_seconds_count{status=~"5.."}`
u odnosu na ukupan broj zahteva, Prometheus provider u `AnalysisTemplate`),
NE stopa 4xx/svih grešaka. Ovo je namerna, važna odluka: v2 legitimno vraća
HTTP 400 kada je `providerId`/`serviceId` nevažeći (`InvalidBookingException`,
vidi `docs/docker-i-v2-izvestaj.md` sekciju 4) — to je **ispravno ponašanje
v2 verzije**, ne kvar. Da je metrika "bilo koja greška", v2 bi izgledala
lošije od v1 zbog toga što radi svoj posao ispravnije, i automatski rollback
bi se aktivirao pogrešno, potkopavajući čitavu poentu v2. 5xx (network greška
ka provider-service-u, timeout, neočekivan izuzetak) je pravi signal "nešto
je stvarno pokvareno".

### 2.6 Scenario za dokazivanje automatskog rollback-a (bitno za odbranu)

Sâm mehanizam se ne "vidi" dok se stvarno ne izazove kvar. Plan: usred
rollout-a (dok je canary na 10% ili 50%) namerno ugasiti `provider-api`
(`kubectl scale deployment provider-api --replicas=0`) — v2 pod-ovi počinju
da dobijaju timeout/connection-refused pri pozivu ka provider-service-u,
5xx stopa raste, `AnalysisRun` propada, Argo Rollouts **automatski** vraća
100% saobraćaja na v1 i označava rollout kao `Degraded`, bez ljudske
intervencije. Ovo je scenario koji treba uvežbati i snimiti/demonstrirati
uživo — to je najjači pojedinačni dokaz teze rada.

**Preduslov koji je lako prevideti: mora postojati kontinuiran saobraćaj.**
I procentualno deljenje (10%/50%) i sâma analiza su besmisleni bez stvarnog
toka zahteva — par ručnih klikova kroz UI ne daje ni vidljivu raspodelu ni
dovoljno podataka da `AnalysisRun` donese pouzdanu odluku. Ne treba pravi
load-testing alat (k6/JMeter je prekomplikovano za ovaj obim) — dovoljan je
mali skript (PowerShell ili Python) koji u petlji šalje POST zahteve ka
`/api/v1/bookings` kroz Gateway (par zahteva u sekundi, u trajanju celog
rollout-a, sa validnim JWT-om test korisnika) i pušta se paralelno dok se
demonstrira `kubectl argo rollouts get rollout --watch`. Ovaj skript je deo
posla u Fazi B, ne posle nje.

## 3. Faza C — Observability (minimalno potrebno da Faza B ima šta da pita)

### 3.1 Booking-service: dodati `micrometer-registry-prometheus`

`pom.xml` već ima `spring-boot-starter-actuator` (proverio sam). Spring Boot
automatski instrumentiše sve HTTP zahteve (`http_server_requests_seconds_count`,
sa `status`/`uri`/`method` tagovima) čim se doda samo
`io.micrometer:micrometer-registry-prometheus` zavisnost i
`management.endpoints.web.exposure.include=prometheus` — **bez ijedne linije
custom koda za brojanje zahteva**. Ovo je tačno metrika iz 2.5.

### 3.2 Ostali servisi — health checks da, metrike ne (svesno skraćeno)

.NET servisi već imaju `/health/live`/`/health/ready` (za K8s probe, 1.5) i
čak imaju pripremljen (ali nikad povezan) `ServiceTelemetry.cs` sa
`Meter`/`Counter`/`Histogram` objektima u `backend/building-blocks/Observability/`
— proverio sam, **trenutno se nigde ne pozivaju** (mrtav kod iz rane faze
projekta). Odluka: ne završavati OpenTelemetry/Prometheus izvoz za .NET
servise sada — jedini servis koji je pod canary-jem (i jedini čije metrike
Argo Rollouts analiza čita) je booking-service. Dovršavanje ove
instrumentacije za ostatak sistema bilo bi "ukras" po definiciji iz sekcije 0.
Ostaje kao jasno imenovan budući rad ako vremena bude viška.

### 3.3 Prometheus + Grafana: `kube-prometheus-stack` (Helm)

Umesto ručno pisanog Prometheus Deployment-a + scrape config-a: standardni
Helm chart koji daje Prometheus, Grafana i potrebne CRD-ove
(`ServiceMonitor`) u jednoj instalaciji. Ovo je i de facto standardna
kombinacija u zvaničnim Argo Rollouts primerima analize (Prometheus
provider), pa prati "poznati put" bez improvizacije. Grafana dodatno daje
gotov grafik latencije/error-rate tokom rollout-a — dobar vizuelni prilog za
sam rad (screenshot grafikona u trenutku kad rollback krene).

Namerno izostavljeno: distribuirano praćenje (Jaeger/Tempo/OpenTelemetry
Collector). Ne služi mehanizmu analize/rollback-a, čisto dodatni alat — cut
po istom principu iz sekcije 0.

## 4. Faza D — CI/CD (najniži prioritet, opciono)

**Odluka: GitHub Actions, samo build+push Docker image-a u GHCR (GitHub
Container Registry) na push u `main`, tagovano git SHA-om. Bez automatskog
deploy-a u klaster (bez Argo CD / GitOps).**

Obrazloženje: tema rada je Argo **Rollouts** (progresivni rollout unutar
klastera), ne Argo **CD**/GitOps (kako se manifesti sinhronizuju sa git-om).
Uvođenje pravog GitOps toka bi bio novi, nezavisan alat/tema koji ne
doprinosi demonstraciji canary rollback mehanizma, a nosi realan rizik da
pojede preostalo vreme. Deploy u lokalni `kind` klaster ostaje ručni/skriptovani
korak (`kind load docker-image` + `kubectl apply`/`kubectl argo rollouts
set image`) — sasvim u redu za lokalni demo koji se brani uživo.

Ako vremena ponestane, **ova faza je prva kandidat za potpuno izbacivanje**
bez štete po glavni argument rada — jasno ovo naglašavam da bude lako za
odluku "šta žrtvovati" ako dođe do pritiska rokom.

## 5. Redosled izvršavanja (prioritet, ne strogo sekvencijalno)

1. `kind` klaster + `kind-config.yaml` + `chronos` namespace
2. Deployment/Service/ConfigMap/Secret manifesti za sve servise OSIM booking-a
   (booking privremeno kao običan Deployment dok se ne stigne do Faze B, da
   sistem odmah radi end-to-end u K8s-u i može da se testira nezavisno)
3. `kube-prometheus-stack` (Helm) + micrometer-registry-prometheus u
   booking-service (Faza C) — mora doći PRE Argo Rollouts analize, jer joj
   treba metrika da upita
4. Argo Rollouts kontroler + `Rollout` resurs (zamena Deployment-a) za
   booking-service + `AnalysisTemplate` (Faza B) — srž rada
5. Uvežban scenario ručnog izazivanja kvara (2.6) — dokaz da automatski
   rollback stvarno radi, ne samo da postoji YAML koji to tvrdi
6. Ingress (1.6) — poliranje, može i pre koraka 4 ako je zgodnije redosledno
7. CI/CD (Faza D) — poslednje, prvo za izbacivanje ako ponestane vremena

## 6. Šta ostaje van obima (eksplicitno, da se ne postavlja pitanje kasnije)

- Service mesh (Istio/Linkerd) — namerno izbegnut, vidi 2.3.
- GitOps / Argo CD — namerno izbegnut, vidi Faza D.
- Sealed secrets / spoljašnji secret manager — namerno izbegnut, vidi 1.4.
- StatefulSet za bazu/RabbitMQ — namerno izbegnut, vidi 1.3.
- Distribuirano praćenje (tracing) — namerno izbegnuto, vidi 3.3.
- Prometheus izvoz za .NET servise — namerno odloženo, vidi 3.2.
- Cloud deployment (pomenut u ranom ADR stub-u kao "izbor cloud okruženja za
  završni demo") — ostaje **opcioni stretch cilj posle svega gore**, ne
  preduslov; lokalni `kind` klaster je dovoljan za kompletnu demonstraciju
  teze rada.
