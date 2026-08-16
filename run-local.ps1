# Pokrece kompletan Chronos sistem lokalno: infrastrukturu (SQL Server, RabbitMQ),
# sve mikroservise, Gateway i frontend, svaki u svom prozoru.
#
# Pokretanje (iz korena repozitorijuma, u PowerShell-u):
#   .\run-local.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "1/3 Pokrecem Docker infrastrukturu (SQL Server + RabbitMQ)..." -ForegroundColor Cyan
docker compose -f "$root\infra\docker\compose.yaml" up -d

Write-Host "Cekam da SQL Server i RabbitMQ budu spremni (~15s)..." -ForegroundColor Cyan
Start-Sleep -Seconds 15

function Start-ServiceWindow($name, $workDir, $command) {
    Write-Host "Pokrecem $name..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workDir'; $command"
}

Write-Host "2/3 Pokrecem mikroservise..." -ForegroundColor Cyan
Start-ServiceWindow "Booking Service (Java)" "$root\backend\services\booking-service" ".\mvnw.cmd spring-boot:run"
Start-ServiceWindow "Auth Service"           "$root\backend\services\auth-service"     "dotnet run"
Start-ServiceWindow "Provider Service"       "$root\backend\services\provider-service" "dotnet run"
Start-ServiceWindow "Payment Service"        "$root\backend\services\payment-service"  "dotnet run"

Start-Sleep -Seconds 5
Start-ServiceWindow "Gateway" "$root\backend\gateway\Gateway" "dotnet run"

Write-Host "3/3 Pokrecem frontend..." -ForegroundColor Cyan
Start-ServiceWindow "Frontend" "$root\frontend" "npm run dev"

Write-Host ""
Write-Host "Sve pokrenuto." -ForegroundColor Yellow
Write-Host "Frontend:  http://localhost:5173"
Write-Host "Gateway:   http://localhost:5076"
Write-Host "RabbitMQ:  http://localhost:15672 (chronos / Chronos!2026)"
