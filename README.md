# Chronos

Chronos je platforma za rezervaciju termina i demonstracioni sistem za diplomski rad
na temu verzionisanja mikroservisa, postepenog uvođenja novih verzija i automatskog
rollback-a.

## Struktura repozitorijuma

```text
Chronos/
├── backend/       API Gateway i mikroservisi
├── frontend/      React web aplikacija
├── infra/         Docker, Kubernetes, Helm, rollout i observability konfiguracija
└── docs/          Projektna, API i arhitektonska dokumentacija
```

## Planirani servisi

| Komponenta | Tehnologija | Odgovornost |
| --- | --- | --- |
| API Gateway | ASP.NET Core | Jedinstvena ulazna tačka za frontend |
| Auth | ASP.NET Core | Korisnici, autentifikacija i autorizacija |
| Provider | ASP.NET Core | Pružaoci usluga, usluge i slobodni termini |
| Booking | ASP.NET Core | Rezervacije i centralni v1/v2 rollout scenario |
| Payment | ASP.NET Core | Plaćanja u test režimu |
| Notification | Java / Spring Boot | Obrada događaja i slanje obaveštenja |

## Planirana infrastruktura

- SQL Server, uz odvojenu bazu ili šemu po servisu
- RabbitMQ za asinhronu komunikaciju
- Docker za pakovanje servisa i lokalni razvoj
- Kubernetes i Helm za deployment
- Argo Rollouts za canary promociju i rollback
- Prometheus i Grafana za metrike i praćenje rollout-a
- k6 za load i failure testove

## Početak rada

Repozitorijum trenutno sadrži početni skelet. Naredni koraci su:

1. definisanje domena, API ugovora i šeme podataka;
2. inicijalizacija ASP.NET Core i Spring Boot projekata;
3. povezivanje React aplikacije sa API Gateway-em;
4. dodavanje lokalnog Docker Compose okruženja;
5. Kubernetes, Helm i rollout konfiguracija.

