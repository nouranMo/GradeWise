package com.example.demo.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

/**
 * Service for executing Python scripts
 */
@Service
public class PythonScriptService {
    
    private static final Logger logger = LoggerFactory.getLogger(PythonScriptService.class);
    
    @Value("${python.script.path}")
    private String pythonScriptPath;
    
    @Value("${python.api.url:http://localhost:5000/analyze_document}")
    private String pythonApiUrl;
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * Runs the analysis Python script with the given options
     * 
     * @param filePath Path to the document file
     * @param analysisOptions Map of analysis options
     * @return Map containing analysis results
     */
    public Map<String, Object> runAnalysis(String filePath, Map<String, Object> analysisOptions) {
        logger.info("Running Python analysis script for: {} with options: {}", filePath, analysisOptions);
        
        try {
            // First, ensure the Flask server is running
            ensureFlaskServerRunning();
            
            // Now send the request to the Flask server
            return sendAnalysisRequest(filePath, analysisOptions);
            
        } catch (Exception e) {
            logger.error("Error running Python analysis script", e);
            throw new RuntimeException("Failed to run analysis: " + e.getMessage(), e);
        }
    }
    
    /**
     * Ensure the Flask server is running
     */
    private void ensureFlaskServerRunning() {
        try {
            // Try to connect to the server first to see if it's already running
            RestTemplate restTemplate = new RestTemplate();
            try {
                restTemplate.getForEntity("http://localhost:5000/", String.class);
                logger.info("Flask server is already running");
                return;
            } catch (Exception e) {
                logger.info("Flask server not running, starting it now...");
            }
            
            // Find the script path
            String scriptPath = findScriptPath();
            if (scriptPath == null) {
                throw new RuntimeException("Could not find Python script. Please check the path configuration.");
            }
            
            logger.info("Using Python script at: {}", scriptPath);
            
            // Build the command to start the Flask server
            List<String> command = new ArrayList<>();
            command.add("python");
            command.add(scriptPath);
            
            logger.info("Starting Flask server with command: {}", command);
            
            // Execute the command
            ProcessBuilder processBuilder = new ProcessBuilder(command);
            processBuilder.redirectErrorStream(true);
            
            // Set the working directory to the directory containing the script
            File scriptFile = new File(scriptPath);
            File scriptDir = scriptFile.getParentFile();
            if (scriptDir != null && scriptDir.exists()) {
                processBuilder.directory(scriptDir);
                logger.info("Setting working directory to: {}", scriptDir.getAbsolutePath());
            }
            
            // Start the process
            Process process = processBuilder.start();
            
            // Read the output in a separate thread
            new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        logger.info("Flask server output: {}", line);
                        
                        // If we see the server is running, we can break
                        if (line.contains("Running on http://")) {
                            logger.info("Flask server started successfully");
                            break;
                        }
                    }
                } catch (Exception e) {
                    logger.error("Error reading Flask server output", e);
                }
            }).start();
            
            // Wait a bit for the server to start
            Thread.sleep(5000);
            
            // Check if the server is running
            try {
                restTemplate.getForEntity("http://localhost:5000/", String.class);
                logger.info("Flask server started successfully");
            } catch (Exception e) {
                logger.warn("Could not connect to Flask server after starting it: {}", e.getMessage());
                // Continue anyway, as the server might still be starting up
            }
            
        } catch (Exception e) {
            logger.error("Error starting Flask server", e);
            throw new RuntimeException("Failed to start Flask server: " + e.getMessage(), e);
        }
    }
    
    /**
     * Send analysis request to the Flask server
     */
    private Map<String, Object> sendAnalysisRequest(String filePath, Map<String, Object> analysisOptions) {
        try {
            logger.info("Sending analysis request to Flask server for file: {}", filePath);
            
            // Create RestTemplate
            RestTemplate restTemplate = new RestTemplate();
            
            // Create request headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            
            // Create multipart request
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            
            // Add the file
            File file = new File(filePath);
            if (!file.exists()) {
                throw new RuntimeException("File not found at path: " + filePath);
            }
            body.add("pdfFile", new FileSystemResource(file));
            
            // Add the analyses
            body.add("analyses", objectMapper.writeValueAsString(analysisOptions));
            
            // Add document type (default to SRS if not specified)
            body.add("documentType", analysisOptions.getOrDefault("documentType", "SRS"));
            
            // Create the request entity
            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            
            // Send the request
            ResponseEntity<String> response = restTemplate.exchange(
                    pythonApiUrl,
                    HttpMethod.POST,
                    requestEntity,
                    String.class);
            
            // Parse the response
            String responseBody = response.getBody();
            logger.info("Received response from Flask server: {}", responseBody);
            
            // Convert to Map
            Map<String, Object> results = objectMapper.readValue(responseBody, Map.class);
            
            return results;
            
        } catch (Exception e) {
            logger.error("Error sending analysis request to Flask server", e);
            throw new RuntimeException("Failed to send analysis request: " + e.getMessage(), e);
        }
    }
    
    /**
     * Find the script path in a way that works across different environments
     */
    private String findScriptPath() {
        logger.info("Looking for Python script at configured path: {}", pythonScriptPath);
        
        // Try the configured path first
        File configuredPath = new File(pythonScriptPath);
        if (configuredPath.exists() && configuredPath.isFile()) {
            return configuredPath.getAbsolutePath();
        }
        
        // Get project root directory
        String projectRoot = System.getProperty("user.dir");
        logger.info("Project root directory: {}", projectRoot);
        
        // Try the standard path relative to the project root
        String standardPath = "src/main/java/com/example/demo/services/srs_analyzer/app.py";
        File standardFile = new File(projectRoot, standardPath);
        if (standardFile.exists() && standardFile.isFile()) {
            return standardFile.getAbsolutePath();
        }
        
        // Try with Spring-App prefix
        File springAppFile = new File(new File(projectRoot, "Spring-App"), standardPath);
        if (springAppFile.exists() && springAppFile.isFile()) {
            return springAppFile.getAbsolutePath();
        }
        
        // Try to find app.py in the srs_analyzer directory
        try {
            List<Path> foundPaths = Files.find(Paths.get(projectRoot), 10, 
                    (path, attr) -> path.getFileName().toString().equals("app.py") && 
                                   path.toString().contains("srs_analyzer"))
                    .limit(1)
                    .toList();
            
            if (!foundPaths.isEmpty()) {
                return foundPaths.get(0).toAbsolutePath().toString();
            }
        } catch (Exception e) {
            logger.warn("Error searching for app.py in srs_analyzer directory: {}", e.getMessage());
        }
        
        // Try to find any app.py as a last resort
        try {
            List<Path> foundPaths = Files.find(Paths.get(projectRoot), 10, 
                    (path, attr) -> path.getFileName().toString().equals("app.py"))
                    .limit(1)
                    .toList();
            
            if (!foundPaths.isEmpty()) {
                return foundPaths.get(0).toAbsolutePath().toString();
            }
        } catch (Exception e) {
            logger.warn("Error searching for app.py: {}", e.getMessage());
        }
        
        logger.error("Could not find Python script at any location");
        return null;
    }
} 