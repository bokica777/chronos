# Build-uje Docker image svakog servisa (isti Dockerfile-ovi kao Docker faza,
# vidi docs/docker-i-v2-izvestaj.md) i ucitava ih DIREKTNO u kind klaster
# ("kind load docker-image") - kind cvorovi ne vide lokalni Docker image
# registry masine domacina, pa bez ovog koraka Pod-ovi zavrsavaju u
# "ErrImageNeverPull"/"ImagePullBackOff".
#
# Tagovi (chronos/<servis>:v1) NAMERNO isti kao komentari u svakom Dockerfile-u -
# svi Deployment/Rollout manifesti u infra/kubernetes i infra/argo-rollouts
# referenciraju bas ove tagove sa "imagePullPolicy: IfNotPresent".
#
# VAZNA RAZLIKA U ODNOSU NA docker-compose FRONTEND BUILD: VITE_API_BASE_URL se
# "peče" u JS bundle u trenutku build-a (Vite cita import.meta.env samo pri
# build-u) - docker-compose koristi "http://localhost:5173", ali ovde frontend
# saobracaj ide kroz Ingress (20-ingress.yaml), pa mora biti "http://chronos.local"
# (bez "/api" - httpClient.ts vec dodaje "/api/v1/..." na apiBaseUrl). Zato je
# frontend image ovde build-ovan DRUGACIJE nego istoimeni Docker Compose image -
# ako se prebacujes izmedju docker-compose i kind demoa, frontend treba rebuild.
#
# Pokretanje (iz korena repozitorijuma, u PowerShell-u):
#   .\infra\scripts\build-and-load-images.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$cluster = "chronos"

function Build-AndLoad($tag, $dockerfile, $context, $buildArgs) {
    Write-Host "Build: $tag" -ForegroundColor Green
    if ($buildArgs) {
        docker build -f $dockerfile -t $tag $buildArgs $context
    } else {
        docker build -f $dockerfile -t $tag $context
    }
    Write-Host "Ucitavam $tag u kind klaster '$cluster'..." -ForegroundColor Cyan
    kind load docker-image $tag --name $cluster
}

Build-AndLoad "chronos/auth-service:v1"         "backend/services/auth-service/Dockerfile"         "$root"
Build-AndLoad "chronos/provider-service:v1"     "backend/services/provider-service/Dockerfile"     "$root"
Build-AndLoad "chronos/payment-service:v1"      "backend/services/payment-service/Dockerfile"      "$root"
Build-AndLoad "chronos/gateway:v1"              "backend/gateway/Gateway/Dockerfile"               "$root"
Build-AndLoad "chronos/booking-service:v1"      "$root/backend/services/booking-service/Dockerfile" "$root/backend/services/booking-service"
Build-AndLoad "chronos/notification-service:v1" "$root/backend/services/notification-service/Dockerfile" "$root/backend/services/notification-service"
Build-AndLoad "chronos/frontend:v1"             "$root/frontend/Dockerfile" "$root/frontend" @("--build-arg", "VITE_API_BASE_URL=http://chronos.local")

Write-Host ""
Write-Host "Svi image-i build-ovani i ucitani u klaster." -ForegroundColor Yellow
Write-Host "Za Fazu B (canary v2 booking-service) isti image se koristi za oba" -ForegroundColor Yellow
Write-Host "Rollout template-a (stable/canary) - razlika je SAMO u BOOKING_VERSION" -ForegroundColor Yellow
Write-Host "environment promenljivoj, ne u razlicitim image tagovima." -ForegroundColor Yellow
