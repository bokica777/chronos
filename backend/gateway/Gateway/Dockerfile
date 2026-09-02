# Build kontekst MORA biti koren repozitorijuma - vidi objasnjenje u
# backend/services/auth-service/Dockerfile (isti obrazac za sve .NET servise).
#
#   docker build -f backend/gateway/Gateway/Dockerfile -t chronos/gateway:v1 .

# --- Build stage ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Directory.Build.props Directory.Packages.props ./
COPY backend/gateway/Gateway/Gateway.csproj backend/gateway/Gateway/Gateway.csproj
RUN dotnet restore backend/gateway/Gateway/Gateway.csproj

COPY backend/building-blocks/ backend/building-blocks/
COPY backend/gateway/Gateway/ backend/gateway/Gateway/
RUN dotnet publish backend/gateway/Gateway/Gateway.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# --- Runtime stage ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Gateway je jedina komponenta koju frontend/browser direktno pogadja - ovaj
# port se mapira na host port u docker-compose-u (podrazumevano 5076, isto
# kao lokalni dev port, da appsettings/.env ne moraju da se menjaju).
EXPOSE 8080

ENTRYPOINT ["dotnet", "Gateway.dll"]
