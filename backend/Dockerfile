FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /src

COPY pom.xml ./
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

COPY --from=build /src/target/*.jar app.jar

EXPOSE 8080

CMD ["sh", "-c", "JAVA_OPTS=\"${JAVA_OPTS:--XX:MaxRAMPercentage=75 -XX:InitialRAMPercentage=25}\"; exec java $JAVA_OPTS -jar /app/app.jar --server.port=${PORT:-8080}"]
