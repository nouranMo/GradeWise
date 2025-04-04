package com.example.demo.services;

import com.example.demo.models.DocumentModel;
import com.example.demo.repositories.DocumentRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.annotation.PostConstruct;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DocumentService {

    private static final Logger logger = LoggerFactory.getLogger(DocumentService.class);

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    // Set an absolute file path for uploads
    private final String uploadDir = System.getProperty("user.dir") + File.separator + "uploads";
    private final String pythonApiUrl = "http://localhost:5000/analyze_document";

    @PostConstruct
    public void init() {
        try {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
                System.out.println("Created upload directory: " + uploadPath.toAbsolutePath());
            } else {
                System.out.println("Upload directory already exists: " + uploadPath.toAbsolutePath());
            }
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory!", e);
        }
    }

    public DocumentModel saveDocument(String userId, MultipartFile file, Map<String, Boolean> selectedAnalyses)
            throws IOException {
        try {
            System.out.println("Saving document for user: " + userId);

            // Ensure upload directory exists
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
                System.out.println("Created upload directory on demand: " + uploadPath.toAbsolutePath());
            }

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
            Path filePath = uploadPath.resolve(uniqueFilename);

            // Save file to disk
            Files.copy(file.getInputStream(), filePath);

            // Create document record
            DocumentModel document = new DocumentModel();
            document.setUserId(userId);
            document.setName(originalFilename);
            document.setFilePath(filePath.toString());
            document.setFileSize(file.getSize());
            document.setStatus("Pending");
            document.setSelectedAnalyses(selectedAnalyses);

            // Save to database
            DocumentModel savedDocument = documentRepository.save(document);
            System.out.println("Document saved with ID: " + savedDocument.getId());

            // Start analysis in background
            System.out.println("Starting analysis for document: " + savedDocument.getId());
            new Thread(() -> {
                try {
                    startAnalysis(savedDocument.getId(), selectedAnalyses);
                } catch (Exception e) {
                    System.err.println("Error in analysis thread: " + e.getMessage());
                    e.printStackTrace();
                }
            }).start();

            return savedDocument;
        } catch (Exception e) {
            System.out.println("Error saving document: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    public void startAnalysis(String documentId, Map<String, Boolean> selectedAnalyses) {
        try {
            DocumentModel document = getDocumentById(documentId);
            if (document == null) {
                logger.error("Document not found with ID: {}", documentId);
                return;
            }

            // Check if any analysis is selected
            if (selectedAnalyses == null || selectedAnalyses.isEmpty()) {
                logger.error("No analysis types selected for document: {}", documentId);
                document.setStatus("Failed");
                document.setAnalyzed(false);
                documentRepository.save(document);
                return;
            }

            // Set initial status
            document.setStatus("Analyzing");
            document.setAnalyzed(false);
            document.setSelectedAnalyses(selectedAnalyses);
            documentRepository.save(document);

            // Create RestTemplate with timeout
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(300000); // 5 minutes
            factory.setReadTimeout(300000); // 5 minutes
            RestTemplate restTemplate = new RestTemplate(factory);

            // Create request to Python API
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            // Create multipart request
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            Path filePath = Paths.get(document.getFilePath());
            File file = filePath.toFile();
            if (!file.exists()) {
                logger.error("File not found at path: {}", filePath);
                document.setStatus("Failed");
                document.setAnalyzed(false);
                documentRepository.save(document);
                return;
            }
            body.add("pdfFile", new FileSystemResource(file));
            body.add("analyses", objectMapper.writeValueAsString(selectedAnalyses));

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            logger.info("Sending request to Python API: {}", pythonApiUrl);
            logger.info("Request body: {}", body);

            // Send request to Python API
            ResponseEntity<String> response = restTemplate.exchange(
                    pythonApiUrl,
                    HttpMethod.POST,
                    requestEntity,
                    String.class);

            logger.info("Received response from Python API: {}", response.getStatusCode());
            logger.info("Response body: {}", response.getBody());

            if (response.getStatusCode() == HttpStatus.OK) {
                // Parse the response
                Map<String, Object> results = objectMapper.readValue(
                        response.getBody(),
                        new TypeReference<Map<String, Object>>() {
                        });

                logger.info("Analysis completed successfully for document: {}", documentId);
                logger.info("Results: {}", results);

                // Update document status
                document.setStatus("Completed");
                document.setResults(results);
                document.setAnalyzed(true);
                document.setAnalysisProgress(100);
                documentRepository.save(document);
                logger.info("Document updated with analysis results: {}", documentId);
            } else {
                logger.error("Python API returned error status: {}", response.getStatusCode());
                logger.error("Error response: {}", response.getBody());
                // Update document status with error
                document.setStatus("Failed");
                document.setResults(Map.of("error", "Analysis failed: " + response.getStatusCode()));
                document.setAnalyzed(false);
                documentRepository.save(document);
            }
        } catch (Exception e) {
            logger.error("Error during analysis: {}", e.getMessage(), e);
            // Update document status with error
            DocumentModel document = documentRepository.findById(documentId).orElse(null);
            if (document != null) {
                document.setStatus("Failed");
                document.setResults(Map.of("error", "Analysis failed: " + e.getMessage()));
                document.setAnalyzed(false);
                documentRepository.save(document);
            }
        }
    }

    public List<DocumentModel> getUserDocuments(String userId) {
        return documentRepository.findByUserId(userId);
    }

    public DocumentModel getDocument(String documentId) {
        return documentRepository.findById(documentId).orElse(null);
    }

    public DocumentModel getDocumentById(String documentId) {
        if (documentId == null || documentId.isEmpty()) {
            System.out.println("Invalid document ID: null or empty");
            return null;
        }

        System.out.println("Looking for document with ID: " + documentId);
        try {
            // Try to find by ID in database
            DocumentModel document = documentRepository.findById(documentId).orElse(null);

            if (document != null) {
                System.out.println("Found document in database: " + document.getName());
                return document;
            }

            // If not found by ID, try to find by ID field
            document = documentRepository.findByIdEquals(documentId);
            if (document != null) {
                System.out.println("Found document by ID field: " + document.getName());
                return document;
            }

            System.out.println("Document not found in database with ID: " + documentId);
            return null;
        } catch (Exception e) {
            System.out.println("Error retrieving document: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    public void deleteDocument(String documentId) throws IOException {
        DocumentModel document = documentRepository.findById(documentId).orElse(null);
        if (document != null) {
            // Delete file from disk
            Path filePath = Paths.get(document.getFilePath());
            Files.deleteIfExists(filePath);

            // Delete from database
            documentRepository.deleteById(documentId);
        }
    }

    public void updateDocumentAnalysis(String documentId, Map<String, Object> results, String status, int progress) {
        DocumentModel document = documentRepository.findById(documentId).orElse(null);
        if (document != null) {
            document.setResults(results);
            document.setStatus(status);
            document.setAnalysisProgress(progress);
            documentRepository.save(document);
        }
    }

    // Save document without analysis preferences (for student uploads)
    public DocumentModel saveDocumentWithoutAnalysis(String userId, MultipartFile file, String documentName)
            throws Exception {
        // Ensure upload directory exists
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
            System.out.println("Created upload directory on demand: " + uploadPath.toAbsolutePath());
        }

        // Generate unique ID
        String documentId = UUID.randomUUID().toString();

        // Save file to disk
        String fileName = documentId + "_" + file.getOriginalFilename();
        Path filePath = Paths.get(uploadDir, fileName);
        file.transferTo(filePath.toFile());

        // Create document model
        DocumentModel document = new DocumentModel();
        document.setId(documentId);
        document.setUserId(userId);
        document.setName(documentName);
        document.setOriginalFilename(file.getOriginalFilename());
        document.setFileSize(file.getSize());
        document.setUploadDate(new Date());
        document.setStatus("Uploaded");
        document.setFilePath(filePath.toString());

        // Save document to repository
        documentRepository.save(document);

        return document;
    }
}