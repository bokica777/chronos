# Architecture Decision Records

ADR dokumenti beleže važnu odluku, razmatrane alternative i posledice odluke.

Prve odluke (rane, iz faze planiranja arhitekture):

1. izbor domena i granica mikroservisa;
2. ASP.NET Core za Gateway, Auth, Provider, Payment i Notification; Spring Boot (Java) za Booking servis;
3. RabbitMQ kao message broker.

## ADR-004: canary rollout kroz Argo Rollouts, "basic canary" bez traffic-router plugina

**Kontekst.** Tema rada je progresivni (canary) rollout Booking servisa. Argo
Rollouts nudi dva režima: "basic canary" (težina = odnos replika ispod istog
Service-a, bez dodatnog alata) i "traffic-managed canary" (tačan procenat
preko traffic-router plugina — Istio, Nginx Ingress canary anotacije, SMI,
Gateway API).

**Odluka.** Basic canary, bez traffic-router plugina.

**Posledice.** Procenat saobraćaja je približan (zavisi od broja replika, ne
egzaktan) umesto tačan — prihvatljivo i treba eksplicitno pomenuti u radu kao
poznatu osobinu, ne sakriti. Zauzvrat, ne uvodi se dodatni infra sloj (npr.
Istio) koji ne bi doprineo demonstraciji samog mehanizma (postepena težina +
automatska analiza + automatski rollback), a nosio bi realan rizik da pojede
preostalo vreme. Detaljan plan: `docs/k8s-argo-rollouts-plan.md` (2.3).

## ADR-005: lokalni `kind` klaster, cloud deployment kao opcioni stretch cilj

**Kontekst.** Rani plan je pominjao i "izbor cloud okruženja za završni
demo".

**Odluka.** `kind` (Kubernetes in Docker) je jedini OBAVEZNI klaster za
demonstraciju teze rada. Cloud deployment ostaje opcioni stretch cilj POSLE
svega ostalog (K8s manifesti, Argo Rollouts, observability), ne preduslov.

**Posledice.** Demo je reproduktivan na bilo kojoj mašini sa Docker Desktop-om
(nema zavisnosti od cloud naloga/troška/mrežnih uslova pred odbranu). Ako
vremena bude viška, cloud deployment se može dodati kao dodatni poglavlje bez
izmene ičega u osnovnom radu.

## ADR-006: AnalysisTemplate metrika — stopa 5xx grešaka, ne stopa svih grešaka

**Kontekst.** Booking v2 namerno vraća HTTP 400 (`InvalidBookingException`)
kada je `providerId`/`serviceId` nevažeći — to je ispravno ponašanje v2, ne
kvar (v1 ovu proveru uopšte ne radi). Ako bi `AnalysisTemplate` posmatrao
"bilo koju grešku" (uključujući 4xx), v2 bi statistički izgledala lošije od
v1 upravo zato što radi svoj posao ispravnije, i automatski rollback bi se
pogrešno aktivirao.

**Odluka.** Metrika analize je stopa 5xx (server) grešaka na
booking-service-u, ne stopa svih HTTP grešaka.

**Posledice.** Automatski rollback reaguje na stvarne kvarove (npr.
provider-service nedostupan → timeout/greška pri v2 pozivu), ne na legitimno
odbijene zahteve. Detalji i scenario za demonstraciju:
`docs/k8s-argo-rollouts-plan.md` (2.5, 2.6).

## ADR-007: `kube-prometheus-stack` (Helm) za observability, bez distribuiranog praćenja

**Kontekst.** Argo Rollouts analiza treba Prometheus kao izvor metrika.

**Odluka.** `kube-prometheus-stack` Helm chart (Prometheus + Grafana +
potrebni CRD-ovi) umesto ručno pisane instalacije; distribuirano praćenje
(Jaeger/Tempo/OpenTelemetry Collector) namerno izostavljeno — ne služi
mehanizmu analize/rollback-a.

**Posledice.** Standardna, dobro dokumentovana kombinacija sa Argo Rollouts
Prometheus providerom (manji rizik od improvizacije), plus Grafana grafikoni
kao gotov vizuelni prilog za sam rad. Booking-service dobija
`micrometer-registry-prometheus` (Spring Boot Actuator već prisutan, dodaje
se samo zavisnost + konfiguracija, bez custom koda za brojanje zahteva).
Ostali servisi zadržavaju samo health-check endpoint-e (već postoje,
`ObservabilityExtensions.cs`) — Prometheus izvoz za njih je svesno odložen
(`ServiceTelemetry.cs` postoji ali se nigde ne poziva — poznat, imenovan
budući rad, ne propust).

## ADR-008: CI/CD ograničen na build+push image-a (GitHub Actions), bez GitOps-a

**Kontekst.** Specifikacija pominje CI/CD kao deo infrastrukture, ali tema
rada je Argo **Rollouts** (progresivni rollout unutar klastera), ne Argo
**CD**/GitOps (sinhronizacija manifesta sa git-om).

**Odluka.** GitHub Actions workflow koji samo build-uje i pushuje Docker
image-e u GHCR na push u `main` (tag = git SHA). Deploy u `kind` klaster
ostaje ručni/skriptovani korak, ne automatski GitOps tok.

**Posledice.** Ne troši vreme na alat koji ne doprinosi demonstraciji
canary/rollback mehanizma. Ovo je i prva faza za izbacivanje u potpunosti ako
ponestane vremena, bez štete po glavni argument rada.

## ADR-009: baza podataka i RabbitMQ u klasteru kao `Deployment`, ne `StatefulSet`

**Kontekst.** SQL Server i RabbitMQ u K8s-u postoje da bi aplikacija radila
tokom demoa, ne da bi se demonstrirala otpornost baze na restart pod-a.

**Odluka.** Obično `Deployment` (1 replika) + `emptyDir`/osnovni PVC, ne
`StatefulSet` sa pravim storage provisioner-om.

**Posledice.** Gubitak stanja pri restartu pod-a je prihvatljiv (demo se i
onako pokreće sveže). Znatno manje infra kompleksnosti za nešto što nije tema
rada.

## ADR-010: `Secret` (plain) umesto sealed-secrets/spoljašnjeg secret managera

**Kontekst.** Stripe test ključevi su već test-mode i već javno vidljivi u
repo istoriji (prošli su kroz GitHub secret-scanning "allow" tok ranije u
projektu).

**Odluka.** Obični K8s `Secret` (base64), bez sealed-secrets/SOPS/Vault.

**Posledice.** Ne brani ništa što već nije javno; ako se postavi pitanje na
odbrani, spominje se kao poznato proširenje za pravu produkciju, bez da se
implementira. Puna lista svesno izostavljenih delova:
`docs/k8s-argo-rollouts-plan.md` (sekcija 6).

