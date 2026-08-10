# Docker

`compose.yaml` diže lokalnu SQL Server bazu i RabbitMQ za razvoj (trenutno samo
Booking servis ih koristi; baze ostalih servisa dodaju se kasnije).

Pokretanje:

```
docker compose up -d
```

SQL Server SA lozinka i RabbitMQ lozinka su definisane u `compose.yaml`
(`Chronos!2026`) — samo za lokalni razvoj, nikad ne koristiti u produkciji. Baze po
servisu (npr. `BookingDb`) prave se ručno jednom po podizanju kontejnera (vidi
README Booking servisa).

RabbitMQ management panel (vizuelni prikaz redova i poruka): `http://localhost:15672`,
prijava `chronos` / `Chronos!2026`.

