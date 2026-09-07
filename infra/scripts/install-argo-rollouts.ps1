# Instalira Argo Rollouts kontroler (pinovan zvanicni release manifest, NE
# Helm - jedan manje alat za instalirati/objasnjavati, prati zvanicnu "Getting
# started" dokumentaciju) + kubectl-argo-rollouts CLI plugin, koji daje
# "kubectl argo rollouts get rollout --watch" - zivu ASCII vizualizaciju
# canary koraka, najbolji pojedinacni "wow" momenat za odbranu.
#
# Preduslov: kube-prometheus-stack VEC instaliran (infra/scripts/install-observability.ps1) -
# AnalysisTemplate cita Prometheus metriku, pa Prometheus mora prethoditi Rollout-u
# koji tu analizu koristi. Vidi docs/k8s-argo-rollouts-plan.md sekciju 5.
#
# Pokretanje (iz korena repozitorijuma, u PowerShell-u):
#   .\infra\scripts\install-argo-rollouts.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "1/3 Kreiram 'argo-rollouts' namespace (cluster-wide kontroler, van 'chronos')..." -ForegroundColor Cyan
kubectl create namespace argo-rollouts --dry-run=client -o yaml | kubectl apply -f -

Write-Host "2/3 Instaliram Argo Rollouts kontroler..." -ForegroundColor Cyan
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
kubectl wait --namespace argo-rollouts --for=condition=available deployment/argo-rollouts --timeout=180s

Write-Host "3/3 Instaliram kubectl-argo-rollouts CLI plugin (krov-plugin manager)..." -ForegroundColor Cyan
$hasKrew = Get-Command kubectl-krew -ErrorAction SilentlyContinue
if ($hasKrew) {
    kubectl krew install argo-rollouts
} else {
    Write-Host "krew nije pronadjen - preskacem automatsku instalaciju CLI plugin-a." -ForegroundColor Yellow
    Write-Host "Rucna instalacija (Windows): preuzeti kubectl-argo-rollouts-windows-amd64.exe sa" -ForegroundColor Yellow
    Write-Host "https://github.com/argoproj/argo-rollouts/releases/latest i preimenovati/dodati u PATH" -ForegroundColor Yellow
    Write-Host "kao 'kubectl-argo-rollouts.exe' (vidi https://argoproj.github.io/argo-rollouts/installation/#kubectl-plugin-installation)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Kontroler instaliran. Sledeci koraci (Faza B):" -ForegroundColor Yellow
Write-Host "  1. kubectl apply -f infra/argo-rollouts/analysistemplate-booking-error-rate.yaml"
Write-Host "  2. kubectl apply -f infra/argo-rollouts/rollout-booking.yaml"
Write-Host "  3. kubectl delete deployment booking-api -n chronos   (zamenjen Rollout-om)"
Write-Host "  4. .\infra\scripts\load-generator.ps1                 (u odvojenom terminalu, kontinuiran saobracaj)"
Write-Host "  5. kubectl apply -f infra/argo-rollouts/rollout-booking-v2.yaml   (pokrece canary)"
Write-Host "  6. kubectl argo rollouts get rollout booking-api -n chronos --watch"
