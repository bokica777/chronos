# Build kontekst MORA biti koren repozitorijuma (ne ovaj folder), jer servis
# deli Directory.Packages.props/Directory.Build.props i backend/building-blocks
# sa ostatkom monorepo-a (relativni <Compile Include> u AuthService.csproj):
#
#   docker build -f backend/services/auth-service/Dockerfile -t chronos/auth-service:v1 .
#
# Namerno se NE kopira global.json u build stage - on na razvojnoj masini pinuje
# .NET 10 SDK (jer je to jedino sto je tamo instalirano), a ovde build image
# vec ima tacno .NET 8 SDK koji projektu (TargetFramework net8.0) i treba, bez
# potrebe za rollForward logikom.

# --- Build stage ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Prvo samo ono sto restore-u treba - odvojen layer od izvornog koda, pa se
# restore ponovo izvrsava samo kad se promeni .csproj ili centralne verzije
# paketa, ne na svaku izmenu C# fajla (brzi rebuild-ovi).
COPY Directory.Build.props Directory.Packages.props ./
COPY backend/services/auth-service/AuthService.csproj backend/services/auth-service/AuthService.csproj
RUN dotnet restore backend/services/auth-service/AuthService.csproj

# Sad ostatak izvornog koda (deljeni building-blocks + sam servis) i publish.
COPY backend/building-blocks/ backend/building-blocks/
COPY backend/services/auth-service/ backend/services/auth-service/
RUN dotnet publish backend/services/auth-service/AuthService.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# --- Runtime stage ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# aspnet:8.0 runtime image od .NET 8 nadalje vec podrazumevano postavlja
# ASPNETCORE_HTTP_PORTS=8080 - ne mora se rucno postavljati. Gateway (appsettings.json)
# vec ocekuje "auth-api:8080" kao ime/port ovog kontejnera na docker mrezi.
EXPOSE 8080

ENTRYPOINT ["dotnet", "AuthService.dll"]
