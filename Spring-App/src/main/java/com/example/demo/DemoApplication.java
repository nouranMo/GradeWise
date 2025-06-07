package com.example.demo;

import java.io.File;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@ComponentScan(basePackages = {"com.example.demo", "com.example.demo.controllers"})
@EnableAsync
public class DemoApplication {
	public static void main(String[] args) {
		// Create uploads directory if it doesn't exist
		String uploadDir = System.getenv("DOCKER_ENV") != null 
			? "/app/uploads" 
			: System.getProperty("user.dir") + File.separator + "uploads";
		File uploadsDir = new File(uploadDir);
		if (!uploadsDir.exists()) {
			boolean created = uploadsDir.mkdirs();
			if (created) {
				System.out.println("Created uploads directory: " + uploadsDir.getAbsolutePath());
			} else {
				System.err.println("Failed to create uploads directory: " + uploadsDir.getAbsolutePath());
			}
		} else {
			System.out.println("Uploads directory already exists: " + uploadsDir.getAbsolutePath());
		}

		SpringApplication.run(DemoApplication.class, args);
	}
}