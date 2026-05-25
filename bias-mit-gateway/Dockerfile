# Multi-stage builf per separare la compilazione del codice dall'esecuzione
# Stage 1: Build con Maven
FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /app
COPY pom.xml .
#dice a Maven di scaricare tutte le dipendenze scritte nel pom
RUN mvn dependency:go-offline -q
COPY src ./src
#compila il codice e crea il pacchetto .jar skippando i test
RUN mvn package -DskipTests -q

# Stage 2: Runtime
#immagine che verrà avviata sul server
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
#copia il .jar creato allo step precedente e lo rinomina in app.jar
COPY --from=builder /app/target/gateway-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

#tecnicamente vengono create due immagini, ma alla fine ne ho solo una che è quella relativa all'esecuzione