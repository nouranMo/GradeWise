package com.example.demo.services;

import com.example.demo.models.DocumentModel;
import com.example.demo.repositories.DocumentRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.task.AsyncTaskExecutor;
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
import java.io.FileNotFoundException;
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

    public DocumentModel saveDocument(String userId, MultipartFile file, Map<String, Boolean> selectedAnalyses,
            String documentType) throws IOException {
        try {
            System.out.println("Saving document for user: " + userId);
            if (documentType == null || (!documentType.equals("SRS") && !documentType.equals("SDD"))) {
                throw new IllegalArgumentException("Invalid documentType: must be SRS or SDD");
            }
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
            document.setStatus("Uploaded");
            document.setAnalyzed(false);
            document.setResults(null);
            document.setSelectedAnalyses(selectedAnalyses);
            document.setUploadDate(new Date());

            // Save to database
            DocumentModel savedDocument = documentRepository.save(document);
            System.out.println("Document saved with ID: " + savedDocument.getId());

            return savedDocument;
        } catch (Exception e) {
            System.out.println("Error saving document: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @Autowired
    private AsyncTaskExecutor taskExecutor;

    public void startAnalysis(String documentId, Map<String, Boolean> selectedAnalyses, String documentType) {
        try {
            DocumentModel document = getDocumentById(documentId);
            if (document == null) {
                logger.error("Document not found with ID: {}", documentId);
                return;
            }

            // Initial status update
            document.setStatus("Analyzing");
            document.setAnalysisInProgress(true);
            document.setAnalyzed(false);
            document.setResults(null);
            document.setSelectedAnalyses(selectedAnalyses);
            documentRepository.save(document);

            // Run analysis in background thread
            taskExecutor.execute(() -> {
                try {
                    performAnalysis(document, selectedAnalyses, documentType);
                } catch (Exception e) {
                    logger.error("Error during analysis: {}", e.getMessage(), e);
                    handleAnalysisError(document, e);
                }
            });

        } catch (Exception e) {
            logger.error("Error starting analysis: {}", e.getMessage(), e);
            handleAnalysisError(getDocumentById(documentId), e);
        }
    }

    private void performAnalysis(DocumentModel document, Map<String, Boolean> selectedAnalyses, String documentType) {
        try {
            // Create RestTemplate with timeout
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(300000);
            factory.setReadTimeout(300000);
            RestTemplate restTemplate = new RestTemplate(factory);

            // Create request to Python API
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            // Create multipart request
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            Path filePath = Paths.get(document.getFilePath());
            File file = filePath.toFile();

            if (!file.exists()) {
                throw new FileNotFoundException("File not found at path: " + filePath);
            }

            body.add("pdfFile", new FileSystemResource(file));
            body.add("analyses", objectMapper.writeValueAsString(selectedAnalyses));
            body.add("documentType", documentType);
            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            logger.info("Sending request to Python API for document: {}", document.getId());
            ResponseEntity<String> response = restTemplate.exchange(
                    pythonApiUrl,
                    HttpMethod.POST,
                    requestEntity,
                    String.class);

            if (response.getStatusCode() == HttpStatus.OK) {
                Map<String, Object> results = objectMapper.readValue(
                        response.getBody(),
                        new TypeReference<Map<String, Object>>() {
                        });

                // Update document with results
                DocumentModel updatedDoc = getDocumentById(document.getId());
                updatedDoc.setStatus("Completed");
                updatedDoc.setResults(results);
                updatedDoc.setAnalysisInProgress(false);
                updatedDoc.setAnalyzed(true);
                updatedDoc.setAnalysisProgress(100);
                documentRepository.save(updatedDoc);

                logger.info("Analysis completed successfully for document: {}", document.getId());
            } else {
                throw new RuntimeException("Analysis failed with status: " + response.getStatusCode());
            }
        } catch (Exception e) {
            handleAnalysisError(document, e);
            throw new RuntimeException("Analysis failed", e);
        }
    }

    private void handleAnalysisError(DocumentModel document, Exception e) {
        if (document != null) {
            try {
                DocumentModel updatedDoc = getDocumentById(document.getId());
                updatedDoc.setStatus("Failed");
                updatedDoc.setAnalysisInProgress(false);
                updatedDoc.setResults(Map.of("error", "Analysis failed: " + e.getMessage()));
                updatedDoc.setAnalyzed(false);
                documentRepository.save(updatedDoc);
                logger.error("Analysis failed for document: {}", document.getId(), e);
            } catch (Exception ex) {
                logger.error("Error updating document status after failure: {}", ex.getMessage(), ex);
            }
        }
    }

    public List<DocumentModel> getUserDocuments(String userId) {
        List<DocumentModel> documents = documentRepository.findByUserId(userId);
        for (DocumentModel doc : documents) {
            logger.info("Document {} - Status: {}, AnalysisInProgress: {}, Analyzed: {}",
                    doc.getId(),
                    doc.getStatus(),
                    doc.isAnalysisInProgress(),
                    doc.isAnalyzed());
        }
        return documents;
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

    /**
     * Update an existing document
     * 
     * @param document The document to update
     * @return The updated document
     */
    public DocumentModel updateDocument(DocumentModel document) {
        // Validate document
        if (document.getId() == null) {
            throw new IllegalArgumentException("Document ID cannot be null for update operation");
        }

        // Save to repository
        return documentRepository.save(document);
    }
}