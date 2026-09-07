# Kubernetes, Argo Rollouts, observability, CI/CD — izveštaj

Datum: 07.09.2026.

Ovaj dokument opisuje šta je izgrađeno u fazi koju `docs/k8s-argo-rollouts-plan.md`
označava kao suštinu diplomskog rada, kako se sve pokreće lokalno (`kind`
klaster na Docker Desktop-u), i šta **nije** provereno uživo (vidi sekciju 6 —
metodološka napomena, važno pročitati pre odbrane).

## 1. Kratak pregled

| Šta | Status |
|---|---|
| `kind` klaster + `ingress-nginx` recept | ✅ |
| Namespace, ConfigMap, Secret, manifesti za sve servise (Faza A) | ✅ |
| Ingress (`http://chronos.local`) | ✅ |
| Prometheus metrika na booking-service-u (`micrometer-registry-prometheus`) | ✅ |
| `kube-prometheus-stack` (Prometheus + Grafana) Helm values + `ServiceMonitor` | ✅ |
| Argo Rollouts `Rollout` + `AnalysisTemplate` (canary 10→50→100, automatska analiza) | ✅ |
| Load-generator skripta (kontinuiran saobraćaj tokom demoa) | ✅ |
| Scenario automatskog rollback-a (dokumentovan korak-po-korak) | ✅ |
| CI/CD (GitHub Actions — build+push u GHCR) | ✅ |
| Uživo isprobano na `kind` klasteru | ⛔ (vidi sekciju 6) |

## 2. Struktura fajlova

```text
infra/
├── kubernetes/           Faza A — "obični" resursi (redosled primene je u imenu fajla)
│   ├── kind-config.yaml       kind klaster + ingress-nginx extraPortMappings
│   ├── 00-namespace.yaml
│   ├── 01-configmap.yaml      ne-tajne vrednosti (servisna imena = ista kao compose.yaml)
│   ├── 02-secret.yaml         connection stringovi + Stripe test-kljucevi
│   ├── 03-sqlserver.yaml      04-rabbitmq.yaml     obican Deployment, emptyDir
│   ├── 05-db-init-job.yaml    K8s Job ekvivalent "sqlserver-init" iz compose.yaml
│   ├── 10..16-*.yaml          Deployment+Service po servisu (auth/provider/payment/
│   │                          notification/booking*/gateway/frontend)
│   └── 20-ingress.yaml
├── argo-rollouts/        Faza B — SRZ RADA
│   ├── analysistemplate-booking-error-rate.yaml
│   ├── rollout-booking.yaml        stabilno v1 stanje (zamenjuje 14-booking-api.yaml)
│   └── rollout-booking-v2.yaml     primena ovog fajla POKREĆE canary
├── observability/        Faza C
│   ├── kube-prometheus-stack-values.yaml
│   └── 21-servicemonitor-booking.yaml
└── scripts/              redosled izvršavanja je numerisan u samim skriptama
    ├── create-cluster.ps1
    ├── build-and-load-images.ps1
    ├── deploy-all.ps1
    ├── install-observability.ps1
    ├── install-argo-rollouts.ps1
    ├── load-generator.ps1
    └── demo-rollback-scenario.md    scenario iz plana, sekcija 2.6, korak-po-korak

.github/workflows/build-images.yml   Faza D
```

*booking-api* je jedini servis koji NIJE u `infra/kubernetes/14-booking-api.yaml`
kao trajno rešenje — taj fajl je Faza A privremeno stanje (da sistem odmah radi
end-to-end), a `infra/argo-rollouts/rollout-booking*.yaml` ga u Fazi B
zamenjuje `Rollout` resursom. Vidi komentare u samim fajlovima za tačan
redosled (`kubectl apply` pa `kubectl delete deployment`).

## 3. Ključne odluke (kratko — pun kontekst i alternative su u `docs/k8s-argo-rollouts-plan.md` i ADR-ovima)

- **Sve env promenljive/servisna imena su identična `infra/docker/compose.yaml`-u.**
  Kubernetes Service DNS radi isto kao Docker Compose mreža (ime = hostname),
  pa YARP (gateway) i Spring (booking/notification) konfiguracija koja već
  referencira `auth-api`, `provider-api` itd. nije morala da se menja nijednim
  redom koda — samo je prepakovana u ConfigMap/Secret umesto `environment:` bloka.
- **`initContainer` "wait-for-sqlserver/rabbitmq"** na svakom servisu koji
  zavisi od baze/RabbitMQ-a — Kubernetes Deployment nema izvorni ekvivalent
  `compose.yaml`-ovog `depends_on: condition: service_completed_successfully`,
  pa bi bez ovoga servisi kratko `CrashLoopBackOff`-ovali dok `sqlserver-init`
  Job ne završi kreiranje baza. Sa `initContainer`-om je start deterministički.
- **Frontend image se build-uje DRUGAČIJE za `kind` nego za `docker-compose`** —
  `VITE_API_BASE_URL` se "peče" u JS bundle pri build-u; `docker-compose`
  koristi `http://localhost:5173`, `kind` demo koristi `http://chronos.local`
  (saobraćaj ide kroz Ingress). `infra/scripts/build-and-load-images.ps1` ovo
  already radi ispravno (poseban `--build-arg`), ali je bitno zapamtiti da
  prebacivanje između docker-compose i kind demoa zahteva frontend rebuild.
- **AnalysisTemplate meri AGREGATNU 5xx stopu na booking-api-ju (ne odvojeno
  canary/stable)** — posledica izabranog "basic canary" pristupa (odnos
  replika, bez traffic-router plugina, vidi plan sekciju 2.3): Prometheus
  scrape na Service nivou ne razdvaja canary/stable bez dodatnog relabeling
  koraka na `rollouts-pod-template-hash` pod labeli, što bi bila dodatna
  složenost van obima "basic canary" odluke. Mehanizam i dalje ispravno
  detektuje kvar (dok god deo saobraćaja ide na pokvarenu v2, agregatna stopa
  raste iznad praga) — puno obrazloženje je kao komentar u samom
  `analysistemplate-booking-error-rate.yaml`.
- **`replicas: 4` na Rollout-u, ne 10** — plan (sekcija 2.3) ilustruje sa 10
  replika radi čiste matematike (10% = tačno 1 pod), ali 10 JVM instanci
  istovremeno na razvojnom laptopu (pored SQL Server-a, RabbitMQ-a,
  Prometheus/Grafana-e, 6 ostalih servisa) je nerealno opterećenje. Sa 4
  replike je zaokruživanje procenta grublje (poznato, već prihvaćeno
  ograničenje basic canary pristupa) ali mehanizam je identično vidljiv.
- **Argo Rollouts kontroler instaliran preko pinovanog release manifesta, ne
  Helm-a** — jedan manje alat, prati zvaničnu "Getting started" dokumentaciju.
  **`kube-prometheus-stack` JESTE preko Helm-a** — de facto standard za
  Prometheus+Grafana+CRD-ove u jednoj instalaciji, izbegava ručno pisan
  scrape config.

## 4. Kako pokrenuti ceo demo (redosled)

Preduslovi (instalirati jednom): Docker Desktop (već imaš), `kind`, `kubectl`,
`helm`, `kubectl-argo-rollouts` CLI plugin (uputstvo u
`infra/scripts/install-argo-rollouts.ps1` ako `krew` nije instaliran).

```powershell
# 1. Klaster + ingress-nginx + namespace
.\infra\scripts\create-cluster.ps1
# -> posle ovog koraka: dodati "127.0.0.1 chronos.local" u hosts fajl (Administrator)

# 2. Build + učitavanje image-a u klaster
.\infra\scripts\build-and-load-images.ps1

# 3. Infra + svi servisi OSIM booking-a kao Rollout (booking je privremeno Deployment)
.\infra\scripts\deploy-all.ps1
# -> proveriti: http://chronos.local radi end-to-end (kao docker-compose danas)

# 4. Observability (MORA pre Argo Rollouts-a - analizi treba Prometheus)
.\infra\scripts\install-observability.ps1

# 5. Argo Rollouts kontroler
.\infra\scripts\install-argo-rollouts.ps1

# 6. Zameniti booking-api Deployment Rollout-om
kubectl apply -f infra/argo-rollouts/analysistemplate-booking-error-rate.yaml
kubectl apply -f infra/argo-rollouts/rollout-booking.yaml
kubectl delete deployment booking-api -n chronos

# 7. Demo - vidi infra/scripts/demo-rollback-scenario.md za tacan redosled
#    (load-generator.ps1 u odvojenom terminalu, pa rollout-booking-v2.yaml,
#    pa namerno gasenje provider-api dok je canary na 50%)
```

## 5. Šta ostaje van obima (podsetnik, već formalizovano u planu/ADR-ovima)

Service mesh, GitOps/Argo CD, sealed secrets, `StatefulSet` za bazu,
distribuirano praćenje (tracing), Prometheus izvoz za .NET servise, cloud
deployment — sve namerno izostavljeno, obrazloženje u
`docs/k8s-argo-rollouts-plan.md` sekciji 6 i `docs/decisions/README.md`.

## 6. Metodološka napomena — VAŽNO pročitati pre odbrane

Isto ograničenje kao u Docker fazi (`docs/docker-i-v2-izvestaj.md`, sekcija 1):
ovo sandbox okruženje nema `kind`/`kubectl`/`helm`/Docker instalirane (samo
`python3` je bio dostupan za proveru), pa ništa od gore navedenog **nije
primenjeno na pravi klaster niti pokrenuto od strane mene**. Svih 19 YAML
manifesta je programski proverio `python3 -c "yaml.safe_load_all(...)"` (svi
prošli bez greške — vidi commit istoriju), a sadržaj (imena servisa, env
promenljive, portovi, health-check putanje) je ručno unakrsno proveren protiv
`infra/docker/compose.yaml`, `application.properties`/`appsettings.json`
fajlova i `SecurityConfig.java` klasa — ali to NIJE zamena za stvarno
pokretanje.

**Pre odbrane, obavezno na svojoj mašini:**
1. Proći kroz sekciju 4 ovog dokumenta od početka do kraja.
2. Posebno obratiti pažnju na `initContainer` timeout-e (SQL Server ume da
   startuje sporije od 15s na sporijem disku — ako `wait-for-sqlserver`
   izgleda da visi, to je normalno, čeka `sqlserver-init` Job).
3. Uvežbati `infra/scripts/demo-rollback-scenario.md` scenario bar jednom pre
   odbrane uživo — ovo je najkompleksniji deo demoa (više pokretnih delova:
   load generator, Argo Rollouts watch, namerno gašenje provider-api,
   posmatranje automatskog rollback-a) i najverovatnije mesto gde nešto može
   iznenaditi (npr. Prometheus scrape interval vs. AnalysisTemplate interval
   usklađenost, resursi na laptopu).
4. Ako nešto ne proradi iz prve — najverovatniji uzroci su navedeni kao
   komentari u samim manifestima (npr. port-name mismatch za ServiceMonitor,
   `imagePullPolicy`/tag mismatch ako se image tag promeni bez izmene ovog
   dokumenta).
