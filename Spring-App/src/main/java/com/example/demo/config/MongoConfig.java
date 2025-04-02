package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(basePackages = "com.example.demo.repositories")
public class MongoConfig {
    // MongoDB configuration is handled by Spring Boot's auto-configuration
    // based on the properties in application.properties
}