package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import java.io.File;

@SpringBootApplication
@ComponentScan(basePackages = "com.example.demo")
public class DemoApplication {
	public static void main(String[] args) {
		// Create uploads directory if it doesn't exist
		String uploadDir = System.getProperty("user.dir") + File.separator + "uploads";
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