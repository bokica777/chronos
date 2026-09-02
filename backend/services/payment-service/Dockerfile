# Build kontekst MORA biti koren repozitorijuma - vidi objasnjenje u
# backend/services/auth-service/Dockerfile (isti obrazac za sve .NET servise).
#
#   docker build -f backend/services/payment-service/Dockerfile -t chronos/payment-service:v1 .

# --- Build stage ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Directory.Build.props Directory.Packages.props ./
COPY backend/services/payment-service/PaymentService.csproj backend/services/payment-service/PaymentService.csproj
RUN dotnet restore backend/services/payment-service/PaymentService.csproj

COPY backend/building-blocks/ backend/building-blocks/
COPY backend/services/payment-service/ backend/services/payment-service/
RUN dotnet publish backend/services/payment-service/PaymentService.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# --- Runtime stage ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "PaymentService.dll"]
