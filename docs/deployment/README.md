# Deployment i rollback

- **Lokalno pokretanje i build Docker image-a** — gotovo, detaljno opisano u
  `docs/docker-i-v2-izvestaj.md` (Dockerfile po servisu, `docker-compose` za
  ceo sistem, v1/v2 Booking verzionisanje).
- Kubernetes manifesti — ⛔ tek sledeća faza.
- Argo Rollouts, canary koraci `10% -> 50% -> 100%`, kriterijumi uspeha i
  automatskog rollback-a, ručni rollback — ⛔ tek sledeća faza (zavisi od
  Kubernetes manifesta).
- Helm instalacija — ⛔.
- Opciona backup/restore procedura — ⛔.

