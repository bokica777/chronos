# Salje kontinuiran, mali tok POST zahteva ka /api/v1/bookings kroz Gateway
# (preko Ingress-a, http://chronos.local) dok traje ceo rollout - BEZ ovoga
# procentualno deljenje saobracaja (10%/50%) i AnalysisTemplate metrika su
# besmisleni (nema saobracaja da se deli niti podataka da Prometheus izmeri).
# Vidi docs/k8s-argo-rollouts-plan.md sekciju 2.6 - namerno NIJE pravi
# load-testing alat (k6/JMeter je prekomplikovano za ovaj obim), samo petlja
# koja simulira "par zahteva u sekundi".
#
# Preduslov: test korisnik vec registrovan (kroz UI ili register endpoint) -
# ovaj skript se prijavljuje pod tim korisnikom da dobije JWT za zahteve.
# Prilagoditi $testEmail/$testPassword/$providerId/$serviceId ispod stvarnim
# vrednostima iz baze pre pokretanja.
#
# Pokretanje (u ODVOJENOM PowerShell terminalu, pusta se dok traje demo):
#   .\infra\scripts\load-generator.ps1

$ErrorActionPreference = "Continue"
$baseUrl = "http://chronos.local"
$testEmail = "loadtest@chronos.local"
$testPassword = "Chronos!2026"
$providerId = "<UUID-postojeceg-provajdera>"
$serviceId = "<UUID-postojece-usluge>"
$servicePrice = 1000

Write-Host "Prijavljujem test korisnika ($testEmail)..." -ForegroundColor Cyan
$loginBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json
try {
    # LoginResponse (backend/services/auth-service/Contracts/UserContracts.cs) vraca
    # "accessToken" (System.Text.Json podrazumevano serijalizuje u camelCase), ne "token".
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.accessToken
} catch {
    Write-Host "Prijava nije uspela - proveri da li test korisnik postoji i da li su $providerId/$serviceId popunjeni." -ForegroundColor Red
    throw
}

Write-Host "Pokrecem kontinuiran saobracaj (Ctrl+C za prekid)..." -ForegroundColor Green
$headers = @{ Authorization = "Bearer $token" }
$count = 0
while ($true) {
    $count++
    # Namerno slucajan (validan opseg) termin - cilj je saobracaj za metriku,
    # ne uspesno kreiranje SVAKE rezervacije (duplikati/zauzeti termini ce
    # ponekad vratiti 400/409, sto je i dalje "normalan" saobracaj za analizu).
    # CreateBookingRequest (booking-service) trazi providerId/serviceId/startTime/
    # endTime/price/idempotencyKey - svih sest su @NotNull/@NotBlank, bez njih bi
    # SVAKI zahtev pao na validaciji pre nego sto uopste stigne do v1/v2 logike.
    $start = (Get-Date).AddDays(1).AddHours((Get-Random -Minimum 9 -Maximum 17))
    $end = $start.AddMinutes(30)
    $body = @{
        providerId     = $providerId
        serviceId      = $serviceId
        startTime      = $start.ToString("yyyy-MM-ddTHH:00:00")
        endTime        = $end.ToString("yyyy-MM-ddTHH:mm:00")
        price          = $servicePrice
        idempotencyKey = [guid]::NewGuid().ToString()
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "$baseUrl/api/v1/bookings" -Method Post -Body $body -ContentType "application/json" -Headers $headers | Out-Null
        Write-Host "[$count] OK" -ForegroundColor DarkGreen
    } catch {
        Write-Host "[$count] $($_.Exception.Response.StatusCode.value__)" -ForegroundColor DarkYellow
    }

    Start-Sleep -Milliseconds 500
}
