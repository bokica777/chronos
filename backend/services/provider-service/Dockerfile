# Build kontekst MORA biti koren repozitorijuma - vidi objasnjenje u
# backend/services/auth-service/Dockerfile (isti obrazac za sve .NET servise).
#
#   docker build -f backend/services/provider-service/Dockerfile -t chronos/provider-service:v1 .

# --- Build stage ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Directory.Build.props Directory.Packages.props ./
COPY backend/services/provider-service/ProviderService.csproj backend/services/provider-service/ProviderService.csproj
RUN dotnet restore backend/services/provider-service/ProviderService.csproj

COPY backend/building-blocks/ backend/building-blocks/
COPY backend/services/provider-service/ backend/services/provider-service/
RUN dotnet publish backend/services/provider-service/ProviderService.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# --- Runtime stage ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Otpremljene slike (Providers/Services) idu u wwwroot/uploads pod ContentRootPath
# (vidi Program.cs) - to mora da bude imenovani volume u docker-compose-u, inace
# se gube pri svakom restartu kontejnera.
EXPOSE 8080

ENTRYPOINT ["dotnet", "ProviderService.dll"]
