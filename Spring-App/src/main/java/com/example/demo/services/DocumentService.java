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
import com.example.demo.models.Submission;
import com.example.demo.repositories.SubmissionRepository;
import com.example.demo.services.DocumentAnalysisService;

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
import java.util.Optional;

@Service
public class DocumentService {

    private static final Logger logger = LoggerFactory.getLogger(DocumentService.class);

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private DocumentAnalysisService documentAnalysisService;

    // Set an absolute file path for uploads
    private final String uploadDir = System.getProperty("user.dir") + File.separator + "uploads";
    
    // Use environment variable for Python API URL, fallback to localhost for development
    private final String pythonApiUrl = System.getenv("PYTHON_API_URL") != null 
        ? System.getenv("PYTHON_API_URL") 
        : "http://localhost:5000/analyze_document";

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
            
            // Log the Python API URL being used
            System.out.println("Python API URL configured as: " + pythonApiUrl);
            String envUrl = System.getenv("PYTHON_API_URL");
            System.out.println("PYTHON_API_URL environment variable: " + (envUrl != null ? envUrl : "not set"));
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory!", e);
        }
    }

    public DocumentModel saveDocument(String userId, MultipartFile file, Map<String, Boolean> selectedAnalyses,
            String documentType) throws IOException {
        try {
            System.out.println("=== DocumentService.saveDocument START ===");
            System.out.println("Saving document for user: " + userId);
            System.out.println("File original name: " + file.getOriginalFilename());
            System.out.println("File size: " + file.getSize());
            System.out.println("Document type: " + documentType);
            System.out.println("Upload directory: " + uploadDir);
            
            if (documentType == null || (!documentType.equals("SRS") && !documentType.equals("SDD"))) {
                throw new IllegalArgumentException("Invalid documentType: must be SRS or SDD");
            }
            
            // Check if file is empty
            if (file.isEmpty()) {
                throw new IllegalArgumentException("File is empty");
            }
            
            // Ensure upload directory exists
            Path uploadPath = Paths.get(uploadDir);
            System.out.println("Upload path absolute: " + uploadPath.toAbsolutePath());
            
            if (!Files.exists(uploadPath)) {
                System.out.println("Creating upload directory...");
                Files.createDirectories(uploadPath);
                System.out.println("Created upload directory: " + uploadPath.toAbsolutePath());
            } else {
                System.out.println("Upload directory already exists: " + uploadPath.toAbsolutePath());
            }
            
            // Check directory permissions
            System.out.println("Directory readable: " + Files.isReadable(uploadPath));
            System.out.println("Directory writable: " + Files.isWritable(uploadPath));

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || originalFilename.trim().isEmpty()) {
                throw new IllegalArgumentException("Original filename is null or empty");
            }
            
            String fileExtension = "";
            int lastDotIndex = originalFilename.lastIndexOf(".");
            if (lastDotIndex > 0 && lastDotIndex < originalFilename.length() - 1) {
                fileExtension = originalFilename.substring(lastDotIndex);
                System.out.println("File extension: " + fileExtension);
            } else {
                System.out.println("No file extension found, using .pdf as default");
                fileExtension = ".pdf";
            }
            
            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
            Path filePath = uploadPath.resolve(uniqueFilename);
            
            System.out.println("Unique filename: " + uniqueFilename);
            System.out.println("Full file path: " + filePath.toAbsolutePath());

            // Save file to disk
            System.out.println("Attempting to save file to disk...");
            try {
                Files.copy(file.getInputStream(), filePath);
                System.out.println("File successfully saved to disk");
                
                // Verify file was actually saved
                if (Files.exists(filePath)) {
                    long savedFileSize = Files.size(filePath);
                    System.out.println("Saved file size: " + savedFileSize + " bytes");
                    System.out.println("Original file size: " + file.getSize() + " bytes");
                } else {
                    throw new IOException("File was not saved - does not exist after copy operation");
                }
            } catch (IOException e) {
                System.err.println("IOException during file save: " + e.getMessage());
                e.printStackTrace();
                throw new IOException("Failed to save file to disk: " + e.getMessage(), e);
            }

            // Create document record
            System.out.println("Creating document record...");
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
            System.out.println("Saving document to database...");
            try {
                DocumentModel savedDocument = documentRepository.save(document);
                System.out.println("Document saved to database with ID: " + savedDocument.getId());
                System.out.println("=== DocumentService.saveDocument SUCCESS ===");
                return savedDocument;
            } catch (Exception e) {
                System.err.println("Exception during database save: " + e.getMessage());
                e.printStackTrace();
                
                // Clean up the file if database save failed
                try {
                    Files.deleteIfExists(filePath);
                    System.out.println("Cleaned up file after database save failure");
                } catch (IOException cleanupEx) {
                    System.err.println("Failed to clean up file after database save failure: " + cleanupEx.getMessage());
                }
                
                throw new IOException("Failed to save document to database: " + e.getMessage(), e);
            }
        } catch (Exception e) {
            System.err.println("=== DocumentService.saveDocument FAILED ===");
            System.err.println("Error saving document: " + e.getMessage());
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
            factory.setConnectTimeout(1800000); // 30 minutes
            factory.setReadTimeout(1800000);    // 30 minutes
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
            logger.info("Python API URL: {}", pythonApiUrl);
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
        if (documentId == null || documentId.isEmpty() || documentId.equals("undefined") || documentId.equals("null")) {
            logger.error("Invalid document ID: {} (length: {})", documentId, 
                        documentId != null ? documentId.length() : "null");
            return null;
        }

        logger.info("Looking for document with ID: '{}' (length: {})", documentId, documentId.length());
        try {
            // Try to find by ID in database
            Optional<DocumentModel> documentOpt = documentRepository.findById(documentId);
            
            if (documentOpt.isPresent()) {
                DocumentModel document = documentOpt.get();
                logger.info("Found document in database: {} (ID: {})", document.getName(), document.getId());
                return document;
            }

            // If not found by ID, try to find by ID field
            DocumentModel document = documentRepository.findByIdEquals(documentId);
            if (document != null) {
                logger.info("Found document by ID field: {} (ID: {})", document.getName(), document.getId());
                return document;
            }

            logger.warn("Document not found in database with ID: {}", documentId);
            return null;
        } catch (Exception e) {
            logger.error("Error retrieving document with ID {}: {}", documentId, e.getMessage(), e);
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

    /**
     * Updates the status of a document
     */
    public void updateDocumentStatus(String documentId, String status) {
        Optional<DocumentModel> documentOpt = documentRepository.findById(documentId);
        if (documentOpt.isPresent()) {
            DocumentModel document = documentOpt.get();
            document.setStatus(status);
            
            // Set analyzed flag based on status
            if ("Completed".equals(status) || "Analyzed".equals(status) || "Graded".equals(status)) {
                document.setAnalyzed(true);
                document.setAnalysisInProgress(false);
            } else if ("Failed".equals(status)) {
                document.setAnalyzed(false);
                document.setAnalysisInProgress(false);
            } else if ("Analyzing".equals(status)) {
                document.setAnalysisInProgress(true);
                document.setAnalyzed(false);
            }
            
            documentRepository.save(document);
        } else {
            throw new RuntimeException("Document not found: " + documentId);
        }
    }

    /**
     * Updates the status of a submission
     */
    public void updateSubmissionStatus(String submissionId, String status) {
        Optional<Submission> submissionOpt = submissionRepository.findById(submissionId);
        if (submissionOpt.isPresent()) {
            Submission submission = submissionOpt.get();
            submission.setStatus(status);
            submissionRepository.save(submission);
        } else {
            throw new RuntimeException("Submission not found: " + submissionId);
        }
    }

    /**
     * Gets the file path for a document
     */
    public String getDocumentFilePath(String documentId) {
        Optional<DocumentModel> documentOpt = documentRepository.findById(documentId);
        if (documentOpt.isPresent()) {
            DocumentModel document = documentOpt.get();
            return document.getFilePath();
        } else {
            throw new RuntimeException("Document not found: " + documentId);
        }
    }

    /**
     * Gets the file path for a submission
     */
    public String getSubmissionFilePath(String submissionId) {
        Optional<Submission> submissionOpt = submissionRepository.findById(submissionId);
        if (submissionOpt.isPresent()) {
            Submission submission = submissionOpt.get();
            return submission.getFilePath();
        } else {
            throw new RuntimeException("Submission not found: " + submissionId);
        }
    }

    /**
     * Analyzes a document with the given options
     */
    public Map<String, Object> analyzeDocument(String filePath, Map<String, Object> analysisOptions) {
        // This should call your existing analysis code
        return documentAnalysisService.analyzeDocument(filePath, analysisOptions);
    }
}