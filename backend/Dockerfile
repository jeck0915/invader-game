FROM gradle:8.7-jdk17 AS build
WORKDIR /app
COPY build.gradle.kts settings.gradle.kts gradle.properties ./
COPY src ./src
RUN gradle buildFatJar --no-daemon

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/*-all.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
