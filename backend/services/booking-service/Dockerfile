# Za razliku od .NET servisa, ovaj Maven modul je potpuno samostalan (nema
# deljenih fajlova van svog foldera), pa je build kontekst OVAJ folder:
#
#   docker build -f backend/services/booking-service/Dockerfile -t chronos/booking-service:v1 backend/services/booking-service

# --- Build stage ---
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /build

# Prvo samo pom.xml - odvojen layer, mvn ne mora da skida sve zavisnosti
# ponovo na svaku izmenu Java koda.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# --- Runtime stage ---
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
# spring-boot-maven-plugin repakuje u jedan izvrsni "fat" jar - originalni
# (neizvrsni) jar se cuva kao *.jar.original i ne pogadja ovaj glob.
COPY --from=build /build/target/*.jar app.jar

# Bez server.port override-a u application.properties - Spring Boot podrazumevano
# slusa na 8080, isto sto Gateway (appsettings.json) i ocekuje za "booking-api".
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
