# Primenjuje sve "obicne" K8s manifeste (infra/kubernetes) po redosledu koji
# postuje zavisnosti (config/secret pre servisa, baza pre sqlserver-init Job-a,
# Job pre servisa koji na njega oslanjaju). Argo Rollouts kontroler i
# Rollout/AnalysisTemplate resursi za booking-api NISU ovde - vidi
# infra/scripts/install-argo-rollouts.ps1 (Faza B, pokrece se odvojeno POSLE
# ovog skripta, kad se sistem vec end-to-end proveri sa booking-api kao
# obican Deployment).
#
# Preduslov: .\infra\scripts\create-cluster.ps1 i .\infra\scripts\build-and-load-images.ps1
#
# Pokretanje (iz korena repozitorijuma, u PowerShell-u):
#   .\infra\scripts\deploy-all.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$k8s = "$root\infra\kubernetes"

Write-Host "1/5 Namespace + konfiguracija..." -ForegroundColor Cyan
kubectl apply -f "$k8s\00-namespace.yaml"
kubectl apply -f "$k8s\01-configmap.yaml"
kubectl apply -f "$k8s\02-secret.yaml"

Write-Host "2/5 Infrastruktura (SQL Server + RabbitMQ)..." -ForegroundColor Cyan
kubectl apply -f "$k8s\03-sqlserver.yaml"
kubectl apply -f "$k8s\04-rabbitmq.yaml"

Write-Host "Cekam da SQL Server i RabbitMQ budu spremni (moze potrajati ~60-90s za SQL Server)..." -ForegroundColor Cyan
kubectl wait --namespace chronos --for=condition=ready pod --selector=app=sqlserver --timeout=180s
kubectl wait --namespace chronos --for=condition=ready pod --selector=app=rabbitmq --timeout=120s

Write-Host "3/5 Inicijalizacija baza (Job)..." -ForegroundColor Cyan
kubectl apply -f "$k8s\05-db-init-job.yaml"
kubectl wait --namespace chronos --for=condition=complete job/sqlserver-init --timeout=120s

Write-Host "4/5 Aplikativni servisi..." -ForegroundColor Cyan
kubectl apply -f "$k8s\10-auth-api.yaml"
kubectl apply -f "$k8s\11-provider-api.yaml"
kubectl apply -f "$k8s\12-payment-api.yaml"
kubectl apply -f "$k8s\13-notification-api.yaml"
kubectl apply -f "$k8s\14-booking-api.yaml"
kubectl apply -f "$k8s\15-gateway.yaml"
kubectl apply -f "$k8s\16-frontend.yaml"

Write-Host "5/5 Ingress..." -ForegroundColor Cyan
kubectl apply -f "$k8s\20-ingress.yaml"

Write-Host ""
Write-Host "Primenjeno. Prati status:" -ForegroundColor Yellow
Write-Host "  kubectl get pods -n chronos --watch"
Write-Host ""
Write-Host "Kad su svi Pod-ovi Running/Ready, aplikacija je dostupna na:" -ForegroundColor Yellow
Write-Host "  http://chronos.local"
