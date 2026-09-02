# Samostalan Maven modul - build kontekst je OVAJ folder (isto kao booking-service):
#
#   docker build -f backend/services/notification-service/Dockerfile -t chronos/notification-service:v1 backend/services/notification-service

# --- Build stage ---
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /build

COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# --- Runtime stage ---
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
COPY --from=build /build/target/*.jar app.jar

# application.properties ovde ima server.port=8082 (namerno, da izbegne
# koliziju sa drugim servisima kad se sve pokrece direktno na localhost-u).
# U kontejneru kolizije nema, ali Gateway (appsettings.json) ocekuje
# "notification-api:8080" - docker-compose zato overriduje SERVER_PORT=8080
# environment promenljivom, umesto da se ovde duplira konfiguracija.
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
