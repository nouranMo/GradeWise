package com.example.demo.controllers;

import com.example.demo.models.DocumentModel;
import com.example.demo.services.DocumentService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.example.demo.models.User;

import java.util.List;
import java.util.Map;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = "http://localhost:3000", allowedHeaders = "*", methods = { RequestMethod.GET, RequestMethod.POST,
        RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS }, allowCredentials = "true")
public class DocumentController {

    private static final Logger logger = LoggerFactory.getLogger(DocumentController.class);

    @Autowired
    private DocumentService documentService;

    @Autowired
    private ObjectMapper objectMapper;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("analyses") String analysesJson,
            @RequestParam("documentType") String documentType,
            @RequestParam("professorId") String professorId) {
        try {
            System.out.println("Received file upload request");
            System.out.println("File name: " + file.getOriginalFilename());
            System.out.println("File size: " + file.getSize());
            System.out.println("Analyses: " + analysesJson);
            System.out.println("Document Type: " + documentType);
            System.out.println("Professor ID: " + professorId);

            // Get current user from authentication
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "User not authenticated"));
            }

            // Get user ID from authentication
            String currentUserId = authentication.getName();
            System.out.println("Current user ID from authentication: " + currentUserId);

            // Verify the current user is the professor
            if (!currentUserId.equals(professorId)) {
                logger.error("Unauthorized upload attempt. Current user ID: {}, Professor ID: {}", currentUserId,
                        professorId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You can only upload documents for your own account"));
            }

            // Parse analyses
            Map<String, Boolean> selectedAnalyses = objectMapper.readValue(analysesJson,
                    new TypeReference<Map<String, Boolean>>() {
                    });

            // Save document with professor's ID
            DocumentModel document = documentService.saveDocument(professorId, file, selectedAnalyses,
                    documentType);
            System.out.println("Document saved with ID: " + document.getId());

            // Return response with document
            return ResponseEntity.ok(Map.of(
                    "message", "Document uploaded successfully",
                    "document", document));
        } catch (Exception e) {
            System.out.println("Error uploading document: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload document: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<DocumentModel>> getUserDocuments(
            @RequestParam(value = "professorId", required = false) String professorId) {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();

            // If professorId is provided and not the same as current user,
            // check if current user has rights to access these documents
            if (professorId != null && !professorId.isEmpty() && !professorId.equals(userId)) {
                logger.info("Filtering documents by professor ID: {}", professorId);
                // In a real system, you'd check if the current user has admin rights
                // For now, just honor the request for simplicity
            } else {
                // Use the current user's ID if no professor ID specified
                professorId = userId;
            }

            List<DocumentModel> documents = documentService.getUserDocuments(professorId);
            return ResponseEntity.ok(documents);
        } catch (Exception e) {
            logger.error("Error fetching documents: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDocumentById(@PathVariable String id) {
        try {
            if (id == null || id.isEmpty() || id.equals("undefined") || id.equals("null")) {
                logger.warn("Invalid document ID provided: {}", id);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("status", "error", "message", "Invalid document ID provided: " + id));
            }
            
            logger.info("Getting document with ID: '{}', ID length: {}", id, id.length());
            DocumentModel document = documentService.getDocumentById(id);
            if (document == null) {
                logger.warn("Document not found with ID: {}", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Document not found with ID: " + id));
            }
            logger.info("Retrieved document: {}", document.getName());
            return ResponseEntity.ok(document);
        } catch (Exception e) {
            logger.error("Error retrieving document: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Error retrieving document: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<?> deleteDocument(@PathVariable String documentId) {
        try {
            documentService.deleteDocument(documentId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Failed to delete document",
                    "message", e.getMessage()));
        }
    }

    @PostMapping("/{documentId}/analyze")
    public ResponseEntity<?> analyzeDocument(
            @PathVariable String documentId,
            @RequestBody Map<String, Object> requestBody) {
        try {
            System.out.println("Received analysis request for document: " + documentId);
            System.out.println("Request body: " + requestBody);

            // Get current user - DISABLED FOR TESTING
            // String currentUserEmail =
            // SecurityContextHolder.getContext().getAuthentication().getName();
            String currentUserEmail = "anonymousUser"; // Use anonymous user for testing
            System.out.println("Current user email: " + currentUserEmail);

            // Find document
            DocumentModel document = documentService.getDocumentById(documentId);
            if (document == null) {
                System.out.println("Document not found with ID: " + documentId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Document not found"));
            }

            // Verify document ownership - DISABLED FOR TESTING
            // if (!document.getUserId().equals(currentUserEmail)) {
            // System.out.println("Access denied. Document owner: " + document.getUserId() +
            // ", Current user: "
            // + currentUserEmail);
            // return ResponseEntity.status(HttpStatus.FORBIDDEN)
            // .body(Map.of("error", "Access denied"));
            // }

            // Get selected analyses from request body
            @SuppressWarnings("unchecked")
            Map<String, Boolean> selectedAnalyses = (Map<String, Boolean>) requestBody.get("analyses");
            System.out.println("Selected analyses: " + selectedAnalyses);
            String documentType = (String) requestBody.get("documentType");
            logger.info("Document type: {}", documentType);
            // Start analysis with selected analyses
            documentService.startAnalysis(documentId, selectedAnalyses, documentType);
            return ResponseEntity.ok(Map.of("message", "Analysis started successfully"));
        } catch (Exception e) {
            System.out.println("Error analyzing document: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to start analysis"));
        }
    }
}