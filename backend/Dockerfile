# Stage 1: Build
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY mvnw pom.xml ./
COPY .mvn .mvn
COPY src ./src
RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests

# Stage 2: Run
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Render assigns port dynamically
ENV PORT=10000
EXPOSE $PORT

# Start the app using Render's dynamic PORT
ENTRYPOINT ["sh", "-c", "java -jar app.jar --server.port=$PORT"]