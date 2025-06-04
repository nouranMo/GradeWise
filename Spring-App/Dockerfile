# Build stage
FROM maven:3.9.4-eclipse-temurin-17 as build

WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Install basic system dependencies
RUN apk add --no-cache curl wget

# Create uploads and logs directories
RUN mkdir -p /app/uploads /app/logs

# Copy the built JAR
COPY --from=build /app/target/*.jar app.jar

# Create entrypoint script
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'echo "Fixing permissions for uploads directory..."' >> /app/entrypoint.sh && \
    echo 'mkdir -p /app/uploads' >> /app/entrypoint.sh && \
    echo 'chmod 755 /app/uploads' >> /app/entrypoint.sh && \
    echo 'if [ -w /app/uploads ]; then' >> /app/entrypoint.sh && \
    echo '  echo "Uploads directory is writable"' >> /app/entrypoint.sh && \
    echo 'else' >> /app/entrypoint.sh && \
    echo '  echo "Warning: Uploads directory is not writable"' >> /app/entrypoint.sh && \
    echo 'fi' >> /app/entrypoint.sh && \
    echo 'echo "Starting application..."' >> /app/entrypoint.sh && \
    echo 'exec "$@"' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# Create a non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Change ownership of working directory
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["java", "-jar", "app.jar"] 