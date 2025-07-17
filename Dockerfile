# Stage 1: Build with Maven + JDK 24
FROM amazoncorretto:24 AS build
RUN yum update -y && yum install -y maven && yum clean all

WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run with Corretto 24 Alpine
FROM amazoncorretto:24-alpine-jdk
WORKDIR /app
COPY --from=build /app/target/ChatMe-SpringBoot-0.0.1-SNAPSHOT.jar ./ChatMe.jar
EXPOSE 8088
CMD ["java", "-jar", "ChatMe.jar"]
