# Instalira kube-prometheus-stack (Prometheus + Grafana + CRD-ovi kao
# ServiceMonitor) preko Helm-a, i primenjuje ServiceMonitor za booking-api.
#
# MORA se pokrenuti PRE Argo Rollouts AnalysisTemplate-a (Faza B) - analizi
# treba Prometheus da bi imao sta da upita. Vidi docs/k8s-argo-rollouts-plan.md
# sekciju 5 (redosled izvrsavanja, korak 3).
#
# Preduslov: Helm (https://helm.sh/docs/intro/install/), klaster vec kreiran
# (infra/scripts/create-cluster.ps1).
#
# Pokretanje (iz korena repozitorijuma, u PowerShell-u):
#   .\infra\scripts\install-observability.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "1/3 Dodajem prometheus-community Helm repo..." -ForegroundColor Cyan
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

Write-Host "2/3 Instaliram kube-prometheus-stack u 'monitoring' namespace..." -ForegroundColor Cyan
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack `
    --namespace monitoring --create-namespace `
    -f "$root\infra\observability\kube-prometheus-stack-values.yaml"

Write-Host "Cekam da Prometheus i Grafana Pod-ovi budu spremni (moze potrajati)..." -ForegroundColor Cyan
kubectl wait --namespace monitoring --for=condition=ready pod --selector="app.kubernetes.io/name=grafana" --timeout=180s
kubectl wait --namespace monitoring --for=condition=ready pod --selector="app.kubernetes.io/name=prometheus" --timeout=180s

Write-Host "3/3 Primenjujem ServiceMonitor za booking-api..." -ForegroundColor Cyan
kubectl apply -f "$root\infra\observability\21-servicemonitor-booking.yaml"

Write-Host ""
Write-Host "Instalirano. Pristup (u odvojenim terminalima, kubectl port-forward blokira terminal):" -ForegroundColor Yellow
Write-Host "  Grafana:    kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80"
Write-Host "              http://localhost:3000  (admin / chronos-admin)"
Write-Host "  Prometheus: kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090"
Write-Host "              http://localhost:9090 - provera metrike: http_server_requests_seconds_count{job='booking-api'}"
