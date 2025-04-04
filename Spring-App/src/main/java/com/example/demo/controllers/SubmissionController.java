package com.example.demo.controllers;

import com.example.demo.models.DocumentModel;
import com.example.demo.models.SubmissionModel;
import com.example.demo.models.SubmissionSlotModel;
import com.example.demo.security.JwtTokenProvider;
import com.example.demo.services.SubmissionService;
import com.example.demo.services.DocumentService;
import com.example.demo.services.UserService;
import com.example.demo.repositories.SubmissionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Collections;
import java.util.HashMap;
import java.util.Date;

@RestController
@RequestMapping("/api/submissions")
@CrossOrigin(origins = "http://localhost:3000", allowedHeaders = "*", methods = { RequestMethod.GET, RequestMethod.POST,
        RequestMethod.PUT,
        RequestMethod.DELETE, RequestMethod.OPTIONS }, allowCredentials = "true")
public class SubmissionController {

    private static final Logger logger = LoggerFactory.getLogger(SubmissionController.class);

    @Autowired
    private SubmissionService submissionService;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private UserService userService;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    // Get all submissions (for professors)
    @GetMapping("")
    public ResponseEntity<List<SubmissionModel>> getAllSubmissions() {
        logger.info("Fetching all submissions");
        try {
            List<SubmissionModel> submissions = submissionService.getAllSubmissions();

            // Log each submission for debugging
            logger.info("Found {} submissions", submissions.size());
            for (SubmissionModel sub : submissions) {
                logger.info("Submission: id={}, documentId={}, slotId={}, userId={}, status={}",
                        sub.getId(), sub.getDocumentId(), sub.getSubmissionSlotId(),
                        sub.getUserId(), sub.getStatus());
            }

            return ResponseEntity.ok(submissions);
        } catch (Exception e) {
            logger.error("Error fetching submissions: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

    // Get available submission slots (for students)
    @GetMapping("/available")
    public ResponseEntity<List<SubmissionSlotModel>> getAvailableSubmissions() {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();

            System.out.println("Fetching available submissions for student: " + userId);

            List<SubmissionSlotModel> availableSubmissions = submissionService.getAvailableSubmissionSlots();
            return ResponseEntity.ok(availableSubmissions);
        } catch (Exception e) {
            System.out.println("Error fetching available submissions: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Get submission slots (for professors)
    @GetMapping("/slots")
    public ResponseEntity<List<SubmissionSlotModel>> getSubmissionSlots() {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();

            System.out.println("Fetching submission slots for professor: " + userId);

            List<SubmissionSlotModel> submissionSlots = submissionService.getSubmissionSlots();
            return ResponseEntity.ok(submissionSlots);
        } catch (Exception e) {
            System.out.println("Error fetching submission slots: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Create a new submission slot (for professors)
    @PostMapping("/slots")
    public ResponseEntity<?> createSubmissionSlot(@RequestBody SubmissionSlotModel submissionSlot) {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();

            System.out.println("Creating submission slot by professor: " + userId);

            SubmissionSlotModel newSlot = submissionService.createSubmissionSlot(submissionSlot, userId);
            return ResponseEntity.ok(newSlot);
        } catch (Exception e) {
            System.out.println("Error creating submission slot: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create submission slot: " + e.getMessage()));
        }
    }

    // Delete a submission slot (for professors)
    @DeleteMapping("/slots/{slotId}")
    public ResponseEntity<?> deleteSubmissionSlot(@PathVariable String slotId) {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();

            System.out.println("Deleting submission slot by professor: " + userId);

            submissionService.deleteSubmissionSlot(slotId);
            return ResponseEntity.ok(Map.of("message", "Submission slot deleted successfully"));
        } catch (Exception e) {
            System.out.println("Error deleting submission slot: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete submission slot: " + e.getMessage()));
        }
    }

    // Submit a document to a submission slot (for students)
    @PostMapping("/student/submit")
    public ResponseEntity<?> submitDocument(@RequestBody Map<String, Object> submissionData) {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();

            System.out.println("Submitting document by student: " + userId);

            String documentId = (String) submissionData.get("documentId");
            String submissionSlotId = (String) submissionData.get("submissionSlotId");
            String submissionType = (String) submissionData.get("submissionType");
            String course = (String) submissionData.get("course");

            System.out.println("Document ID: " + documentId);
            System.out.println("Submission Slot ID: " + submissionSlotId);

            // Verify document exists before submission
            DocumentModel document = documentService.getDocumentById(documentId);
            if (document == null) {
                System.out.println("Document not found with ID: " + documentId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Document not found with ID: " + documentId));
            }

            System.out.println("Found document: " + document.getName() + " at path: " + document.getFilePath());

            SubmissionModel submission = submissionService.submitDocument(
                    documentId, submissionSlotId, submissionType, course, userId);

            return ResponseEntity.ok(Map.of(
                    "message", "Document submitted successfully",
                    "submission", submission));
        } catch (Exception e) {
            System.out.println("Error submitting document: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to submit document: " + e.getMessage()));
        }
    }

    // Delete a student submission
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSubmission(@PathVariable String id) {
        logger.info("Received request to delete submission with ID: {}", id);
        try {
            // Attempt to get the submission first to make sure it exists
            SubmissionModel submission = submissionService.getSubmission(id);
            if (submission == null) {
                logger.error("Submission with ID {} not found for deletion", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Submission not found"));
            }

            logger.info("Found submission to delete: {}", submission);

            // Delete the submission
            submissionService.deleteSubmission(id);
            logger.info("Successfully deleted submission with ID: {}", id);

            return ResponseEntity.ok(Map.of("message", "Submission deleted successfully"));
        } catch (Exception e) {
            logger.error("Error deleting submission with ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete submission: " + e.getMessage()));
        }
    }

    // Analyze a student submission
    @PostMapping("/{submissionId}/analyze")
    public ResponseEntity<?> analyzeSubmission(
            @PathVariable String submissionId,
            @RequestBody(required = false) Map<String, Object> requestBody) {

        logger.info("Received request to analyze submission: {}", submissionId);

        try {
            // Find the submission
            SubmissionModel submission = submissionService.getSubmission(submissionId);
            if (submission == null) {
                logger.error("Submission not found with ID: {}", submissionId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Collections.singletonMap("error", "Submission not found with ID: " + submissionId));
            }

            // Get the document associated with the submission
            String documentId = submission.getDocumentId();
            if (documentId == null || documentId.isEmpty()) {
                logger.error("No document associated with this submission: {}", submissionId);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Collections.singletonMap("error", "No document associated with this submission"));
            }

            logger.info("Analyzing document ID: {} for submission: {}", documentId, submissionId);

            // Extract analyses from request body if provided
            Map<String, Boolean> analyses = new HashMap<>();

            // Default analyses if none provided
            analyses.put("SrsValidation", true);
            analyses.put("ReferencesValidation", true);
            analyses.put("ContentAnalysis", true);
            analyses.put("SpellCheck", true);

            // If analyses were specified in the request, use those instead
            if (requestBody != null && requestBody.containsKey("analyses")) {
                Object analysesObj = requestBody.get("analyses");
                if (analysesObj instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Boolean> requestedAnalyses = (Map<String, Boolean>) analysesObj;
                    logger.info("Custom analyses requested: {}", requestedAnalyses);
                    analyses = requestedAnalyses;
                }
            }

            logger.info("Performing analysis with options: {}", analyses);

            // Update submission status to Analyzing
            submission.setStatus("Analyzing");
            submission.setLastModified(new Date());
            submissionRepository.save(submission);

            logger.info("Updated submission status to Analyzing");

            // Start document analysis with the specified options
            DocumentModel document = documentService.getDocumentById(documentId);
            if (document == null) {
                logger.error("Document not found for submission: document_id={}, submission_id={}", documentId,
                        submissionId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Document not found for this submission"));
            }

            // Start analysis in background
            try {
                documentService.startAnalysis(documentId, analyses);
                logger.info("Analysis started for document: {}", documentId);

                // Directly call the analyzeSubmission method with the submission ID and
                // analyses
                SubmissionModel analyzedSubmission = submissionService.analyzeSubmission(submissionId, analyses);

                logger.info("Analysis started for submission: {}", submissionId);
                return ResponseEntity.ok(Map.of(
                        "status", "success",
                        "message", "Analysis started successfully",
                        "submissionId", analyzedSubmission.getId(),
                        "documentId", analyzedSubmission.getDocumentId(),
                        "analyses", analyses,
                        "submissionStatus", analyzedSubmission.getStatus()));
            } catch (Exception e) {
                logger.error("Failed to start analysis: {}", e.getMessage(), e);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Failed to start analysis: " + e.getMessage()));
            }
        } catch (Exception e) {
            logger.error("Error analyzing submission: " + submissionId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Error analyzing submission: " + e.getMessage()));
        }
    }

    // Get a specific submission by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getSubmissionById(@PathVariable String id) {
        logger.info("Fetching submission with ID: {}", id);
        try {
            SubmissionModel submission = submissionService.getSubmission(id);
            if (submission == null) {
                logger.error("Submission not found with ID: {}", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Submission not found", "submission_id", id));
            }

            logger.info("Found submission: {}", submission);

            // If the submission has a document ID, try to get the document results
            if (submission.getDocumentId() != null) {
                DocumentModel document = documentService.getDocumentById(submission.getDocumentId());
                if (document != null && document.getResults() != null) {
                    logger.info("Found document with results: {}", document.getId());
                    submission.setResults(document.getResults());
                }
            }

            return ResponseEntity.ok(submission);
        } catch (Exception e) {
            logger.error("Error fetching submission with ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch submission: " + e.getMessage()));
        }
    }

    // Get submissions for the current student
    @GetMapping("/student")
    public ResponseEntity<List<SubmissionModel>> getStudentSubmissions() {
        logger.info("Fetching submissions for current student");
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();

            logger.info("Fetching submissions for student: {}", userId);

            // Get submissions for this student
            List<SubmissionModel> studentSubmissions = submissionService.getSubmissionsForStudent(userId);

            logger.info("Found {} raw submissions for student {}", studentSubmissions.size(), userId);

            // For each submission, try to fetch document results if available
            for (SubmissionModel submission : studentSubmissions) {
                logger.info("Processing student submission: id={}, documentId={}, status={}",
                        submission.getId(), submission.getDocumentId(), submission.getStatus());

                if (submission.getDocumentId() != null) {
                    // Always get the latest document to check its status
                    DocumentModel document = documentService.getDocumentById(submission.getDocumentId());

                    if (document != null) {
                        logger.info("Found document for submission: document_id={}, document_status={}",
                                document.getId(), document.getStatus());

                        // Synchronize status between document and submission if needed
                        if (("Completed".equals(document.getStatus()) ||
                                "Analyzed".equals(document.getStatus()) ||
                                "Graded".equals(document.getStatus())) &&
                                !("Analyzed".equals(submission.getStatus()) ||
                                        "Graded".equals(submission.getStatus()))) {

                            logger.info("Document is analyzed but submission is not. Updating submission status.");
                            submission.setStatus("Analyzed");
                            submissionRepository.save(submission);
                        }

                        // Always copy results if available
                        if (document.getResults() != null) {
                            submission.setResults(document.getResults());
                            logger.info("Added document results to submission: {}", submission.getId());
                        }
                    } else {
                        logger.warn("Document not found for submission: document_id={}", submission.getDocumentId());
                    }
                }
            }

            logger.info("Returning {} enhanced submissions for student {}", studentSubmissions.size(), userId);
            return ResponseEntity.ok(studentSubmissions);
        } catch (Exception e) {
            logger.error("Error fetching student submissions: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }
}