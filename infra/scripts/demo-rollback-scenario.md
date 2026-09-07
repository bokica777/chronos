# Scenario: automatski rollback tokom canary rollout-a

Ovo je "najjači pojedinačni dokaz teze rada" (docs/k8s-argo-rollouts-plan.md,
sekcija 2.6) - namerno izazvan kvar u infrastrukturi tokom rollout-a, koji
Argo Rollouts sam prepoznaje i sam vraća saobraćaj na v1, bez ljudske
intervencije. Uvežbati ovaj redosled PRE odbrane (idealno snimiti kao rezervu
ako uživo demo zakaže).

## Preduslovi

Ceo klaster gore i zdrav (`kubectl get pods -n chronos` - sve `Running`),
uključujući `kube-prometheus-stack` (Faza C) i Argo Rollouts kontroler
(Faza B), i `booking-api` kao `Rollout` (ne `Deployment`) na stabilnom v1.

## Koraci

1. **Otvoriti tri terminala:**
   - Terminal A: `kubectl argo rollouts get rollout booking-api -n chronos --watch`
     (živa ASCII vizualizacija - glavni ekran za komisiju)
   - Terminal B: `.\infra\scripts\load-generator.ps1` (kontinuiran saobraćaj)
   - Terminal C: slobodan, za komande ispod

2. **Pokrenuti canary** (Terminal C):
   ```powershell
   kubectl apply -f infra/argo-rollouts/rollout-booking-v2.yaml
   ```
   Pratiti Terminal A: `setWeight: 10` počinje, jedan canary Pod se diže,
   AnalysisRun kreće posle prvog koraka (analiza traje ~1 min - 4 merenja na 15s).

3. **Sačekati da prva analiza PROĐE** (5xx stopa je i dalje niska - v2 samo
   radi svoj posao, provider-service je i dalje gore) - rollout automatski
   ide na `setWeight: 50`, nova analiza kreće.

4. **Namerno izazvati kvar** (Terminal C), DOK je canary na 50%:
   ```powershell
   kubectl scale deployment provider-api --replicas=0 -n chronos
   ```
   v2 Pod-ovi (koji za svaku rezervaciju pozivaju provider-service radi
   validacije - vidi `ProviderServiceClient`) počinju da dobijaju
   connection-refused/timeout, što se manifestuje kao HTTP 5xx odgovor
   klijentu (ne 400 - to bi bila neispravna rezervacija, ovo je infrastrukturni
   kvar). 5xx stopa u Prometheus-u raste.

5. **Posmatrati automatski rollback** (Terminal A): tekuća `AnalysisRun`
   prelazi u `Failed` (agregatna 5xx stopa >= 5% prag iz
   `analysistemplate-booking-error-rate.yaml`), Argo Rollouts **sam**:
   - vraća 100% saobraćaja na stabilnu v1 ReplicaSet-u,
   - gasi canary Pod-ove,
   - označava Rollout kao `Degraded`.

   Nijedna ljudska komanda nije pokrenula ovaj povratak - to je poenta.

6. **Vratiti provider-api** (oporavak infrastrukture, ne dela mehanizma koji se dokazuje):
   ```powershell
   kubectl scale deployment provider-api --replicas=1 -n chronos
   ```

7. **(Opciono) Grafana screenshot za rad**: otvoriti Prometheus/Grafana
   (`.\infra\scripts\install-observability.ps1` izlaz ima port-forward komande)
   i sačuvati grafikon `booking-error-rate` upita tačno u trenutku skoka i
   povratka - ovo je vizuelni prilog pomenut u planu, sekcija 2.7.

## Funkcionalni dokaz da je v2 "bolja" (odvojeno od gornjeg scenarija)

Namerno JEDNA curl komanda, ne formalni test paket (vidi plan sekciju 2.7):

```powershell
# Zamentiti <token> i <nepostojeci-provider-guid>
curl -X POST http://chronos.local/api/v1/bookings `
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" `
  -d '{"providerId":"<nepostojeci-provider-guid>","serviceId":"...","startTime":"...","endTime":"...","price":1000,"idempotencyKey":"demo-1"}'
```

- Sa `BOOKING_VERSION=v1`: rezervacija se kreira uprkos nevažećem provajderu (propust).
- Sa `BOOKING_VERSION=v2`: HTTP 400 sa jasnom porukom (`InvalidBookingException`) - ispravno ponašanje.

## Vraćanje na stabilno stanje posle demoa

```powershell
kubectl apply -f infra/argo-rollouts/rollout-booking.yaml
```
