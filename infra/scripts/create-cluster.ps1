# Kreira lokalni "chronos" kind klaster + chronos namespace + ingress-nginx
# (zvanicni "kind" recept - vidi https://kind.sigs.k8s.io/docs/user/ingress/).
#
# Preduslovi (instalirati rucno, jednom):
#   - Docker Desktop (vec instaliran, koristi se i za docker-compose fazu)
#   - kind:    https://kind.sigs.k8s.io/docs/user/quick-start/#installation
#   - kubectl: https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/
#   - kubectl-argo-rollouts plugin (za Fazu B): vidi infra/scripts/install-argo-rollouts.ps1
#
# Pokretanje (iz korena repozitorijuma, u PowerShell-u):
#   .\infra\scripts\create-cluster.ps1
#
# Posle ovog koraka: dodati u hosts fajl (kao Administrator)
#   C:\Windows\System32\drivers\etc\hosts
#   127.0.0.1 chronos.local
# - potrebno za Ingress (20-ingress.yaml) i za Frontend_Base_Url/CORS iz 01-configmap.yaml.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "1/3 Kreiram kind klaster 'chronos' (ako vec ne postoji)..." -ForegroundColor Cyan
$existing = kind get clusters 2>$null
if ($existing -contains "chronos") {
    Write-Host "Klaster 'chronos' vec postoji, preskacem kreiranje." -ForegroundColor Yellow
} else {
    kind create cluster --config "$root\infra\kubernetes\kind-config.yaml"
}

Write-Host "2/3 Instaliram ingress-nginx (zvanicni kind recept)..." -ForegroundColor Cyan
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
Write-Host "Cekam da ingress-nginx controller pod bude spreman (moze potrajati ~60s)..." -ForegroundColor Cyan
kubectl wait --namespace ingress-nginx `
    --for=condition=ready pod `
    --selector=app.kubernetes.io/component=controller `
    --timeout=180s

Write-Host "3/3 Kreiram 'chronos' namespace..." -ForegroundColor Cyan
kubectl apply -f "$root\infra\kubernetes\00-namespace.yaml"

Write-Host ""
Write-Host "Klaster spreman. Sledeci koraci:" -ForegroundColor Yellow
Write-Host "  1. Dodaj '127.0.0.1 chronos.local' u hosts fajl (Administrator)"
Write-Host "  2. .\infra\scripts\build-and-load-images.ps1   (build + ucitavanje Docker image-a)"
Write-Host "  3. .\infra\scripts\deploy-all.ps1               (primena svih manifesta)"
