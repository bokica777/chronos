# Infrastruktura

```text
infra/
├── docker/          lokalni kontejneri i Docker Compose
├── kubernetes/      zajednički manifesti i namespace-i
├── helm/            chart-ovi po deployable komponenti
├── argo-rollouts/   rollout i analysis template-i
├── observability/   Prometheus i Grafana
└── scripts/         pomoćne development i deployment skripte
```

Osetljive vrednosti se ne čuvaju u repozitorijumu. Za lokalni razvoj koriste se
`.env` fajlovi izvedeni iz javnih `.env.example` primera.

