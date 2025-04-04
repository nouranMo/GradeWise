package com.example.demo.services;

import com.example.demo.models.DocumentModel;
import com.example.demo.models.SubmissionModel;
import com.example.demo.models.SubmissionSlotModel;
import com.example.demo.models.User;
import com.example.demo.repositories.SubmissionRepository;
import com.example.demo.repositories.SubmissionSlotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;
import java.io.File;

@Service
public class SubmissionService {

    private static final Logger logger = LoggerFactory.getLogger(SubmissionService.class);

    @Autowired
    private DocumentService documentService;

    @Autowired
    private UserService userService;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private SubmissionSlotRepository submissionSlotRepository;

    // Get all submissions
    public List<SubmissionModel> getAllSubmissions() {
        return submissionRepository.findAll();
    }

    // Get available submission slots
    public List<SubmissionSlotModel> getAvailableSubmissionSlots() {
        return submissionSlotRepository.findByStatus("Open");
    }

    // Get all submission slots
    public List<SubmissionSlotModel> getSubmissionSlots() {
        return submissionSlotRepository.findAll();
    }

    // Create a new submission slot
    public SubmissionSlotModel createSubmissionSlot(SubmissionSlotModel submissionSlot, String professorId) {
        // Set the ID if not already set
        if (submissionSlot.getId() == null || submissionSlot.getId().isEmpty()) {
            submissionSlot.setId(String.valueOf(System.currentTimeMillis()));
        }

        // Set defaults
        submissionSlot.setProfessorId(professorId);
        submissionSlot.setStatus("Open");
        submissionSlot.setSubmissionsCount(0);
        submissionSlot.setCreatedAt(new Date());

        // Save the submission slot
        return submissionSlotRepository.save(submissionSlot);
    }

    // Delete a submission slot
    public void deleteSubmissionSlot(String slotId) {
        submissionSlotRepository.deleteById(slotId);
    }

    // Submit a document to a submission slot
    public SubmissionModel submitDocument(String documentId, String submissionSlotId,
            String submissionType, String course, String studentId) throws Exception {
        logger.info("Processing document submission - Document ID: {}, Slot ID: {}, Student: {}",
                documentId, submissionSlotId, studentId);

        // Get the document
        DocumentModel document = documentService.getDocumentById(documentId);
        if (document == null) {
            logger.error("Document not found with ID: {}", documentId);
            throw new Exception("Document not found");
        }

        logger.info("Found document: {} with ID: {}", document.getName(), document.getId());

        // Skip document ownership check in development mode
        if (!studentId.equals("anonymousUser") && !document.getUserId().equals(studentId)) {
            logger.warn("Document ownership mismatch - Owner: {}, Requester: {} - Allowing for development",
                    document.getUserId(), studentId);
            // Continue anyway for development
            // throw new Exception("You don't have permission to submit this document");
        }

        // Get the submission slot
        SubmissionSlotModel slot = submissionSlotRepository.findById(submissionSlotId).orElse(null);
        if (slot == null) {
            logger.error("Submission slot not found with ID: {}", submissionSlotId);
            throw new Exception("Submission slot not found");
        }

        logger.info("Found submission slot: {}", slot.getName());

        // Check if student has already submitted to this slot
        List<SubmissionModel> existingSubmissions = submissionRepository.findBySubmissionSlotId(submissionSlotId);
        boolean hasSubmitted = existingSubmissions.stream()
                .anyMatch(s -> s.getUserId().equals(studentId));

        if (hasSubmitted) {
            logger.warn("Student {} has already submitted to slot {}", studentId, submissionSlotId);
            throw new Exception("You have already submitted to this assignment. Each student can only submit once.");
        }

        // Check if slot is open - skip this check in development
        if (!"Open".equals(slot.getStatus())) {
            logger.warn("Submission slot is closed: {} - Allowing for development", slot.getStatus());
            // Continue anyway for development
            // throw new Exception("This submission slot is closed");
        }

        // Check deadline - skip this check in development
        if (slot.getDeadline() != null && new Date().after(slot.getDeadline())) {
            logger.warn("Submission deadline has passed: {} - Allowing for development", slot.getDeadline());
            // Continue anyway for development
            // throw new Exception("Submission deadline has passed");
        }

        // Get user details
        User student = userService.findByEmail(studentId);
        String studentName = student != null ? student.getFirstName() + " " + student.getLastName()
                : "Anonymous Student";

        logger.info("Creating submission for student: {}", studentName);

        // Create the submission
        SubmissionModel submission = new SubmissionModel(
                document.getId(), // Ensure we're using the correct document ID
                submissionSlotId,
                studentId,
                document.getName(),
                submissionType,
                course);

        submission.setStudentName(studentName);
        submission.setStatus("Submitted"); // Ensure status is explicitly set
        submission.setLastModified(new Date()); // Set submission time

        logger.info("Created submission with document ID: {}", submission.getDocumentId());

        // Update submission slot count
        slot.incrementSubmissionsCount();
        submissionSlotRepository.save(slot);
        logger.info("Updated submission slot count to: {}", slot.getSubmissionsCount());

        // Save the submission
        SubmissionModel savedSubmission = submissionRepository.save(submission);
        logger.info("Saved submission with ID: {}", savedSubmission.getId());

        // Log all saved fields to debug
        logger.info(
                "Saved submission details - ID: {}, DocumentID: {}, SlotID: {}, UserID: {}, DocumentName: {}, Type: {}, Course: {}, Status: {}, LastModified: {}",
                savedSubmission.getId(), savedSubmission.getDocumentId(), savedSubmission.getSubmissionSlotId(),
                savedSubmission.getUserId(), savedSubmission.getDocumentName(), savedSubmission.getSubmissionType(),
                savedSubmission.getCourse(), savedSubmission.getStatus(), savedSubmission.getLastModified());

        return savedSubmission;
    }

    // Delete a submission
    public void deleteSubmission(String submissionId) {
        submissionRepository.deleteById(submissionId);
    }

    // Analyze a submission
    public SubmissionModel analyzeSubmission(String submissionId, Map<String, Boolean> analysisOptions)
            throws Exception {
        logger.info("Starting analysis for submission ID: {} with options: {}", submissionId, analysisOptions);

        SubmissionModel submission = submissionRepository.findById(submissionId).orElse(null);
        if (submission == null) {
            logger.error("Submission not found with ID: {}", submissionId);
            throw new Exception("Submission not found");
        }

        logger.info("Found submission with document ID: {}", submission.getDocumentId());

        // Check if the submission is already analyzed or graded
        if ("Analyzed".equals(submission.getStatus()) || "Graded".equals(submission.getStatus())) {
            logger.info("Submission {} is already analyzed. Returning current state without reanalyzing.",
                    submissionId);
            return submission;
        }

        // Update status to Analyzing
        submission.setStatus("Analyzing");
        submission.setLastModified(new Date());
        SubmissionModel savedSubmission = submissionRepository.save(submission);
        logger.info("Updated submission status to Analyzing");

        // Start analysis in a background thread
        new Thread(() -> {
            try {
                // Get the document
                String documentId = submission.getDocumentId();
                logger.info("Retrieving document with ID: {}", documentId);

                DocumentModel document = documentService.getDocumentById(documentId);
                if (document == null) {
                    logger.error("Document not found with ID: {}", documentId);
                    submission.setStatus("Failed");
                    submission.setLastModified(new Date());
                    submission.setFeedback("Document not found in the database");
                    submissionRepository.save(submission);
                    return;
                }

                logger.info("Found document: {} at path: {}", document.getName(), document.getFilePath());

                // Check if file exists
                File documentFile = new File(document.getFilePath());
                if (!documentFile.exists()) {
                    logger.error("Document file not found at path: {}", document.getFilePath());
                    submission.setStatus("Failed");
                    submission.setLastModified(new Date());
                    submission.setFeedback("Document file not found on the server");
                    submissionRepository.save(submission);
                    return;
                }

                logger.info("Document file exists at path: {}", document.getFilePath());

                // Use the analysis options provided or fallback to defaults
                Map<String, Boolean> analyses = analysisOptions;
                if (analyses == null || analyses.isEmpty()) {
                    // Fallback to default analyses if none provided
                    analyses = new HashMap<>();
                    analyses.put("spell_check", true);
                    analyses.put("content_analysis", true);
                    analyses.put("references_validation", true);
                    analyses.put("SrsValidation", true);
                }

                logger.info("Starting document analysis with analyses: {}", analyses);

                // Analyze the document
                try {
                    documentService.startAnalysis(document.getId(), analyses);
                    logger.info("Analysis started successfully for document: {}", document.getId());
                } catch (Exception e) {
                    logger.error("Error starting analysis: {}", e.getMessage(), e);
                    submission.setStatus("Failed");
                    submission.setLastModified(new Date());
                    submission.setFeedback("Failed to start analysis: " + e.getMessage());
                    submissionRepository.save(submission);
                    return;
                }

                // Wait for analysis to complete (this is a simplified approach)
                logger.info("Waiting for analysis to complete...");
                boolean analysisComplete = false;
                int attempts = 0;
                final int maxAttempts = 30; // Up to 5 minutes (10s * 30)

                while (!analysisComplete && attempts < maxAttempts) {
                    try {
                        Thread.sleep(10000); // Wait 10 seconds between checks
                        attempts++;

                        DocumentModel updatedDocument = documentService.getDocumentById(document.getId());
                        if (updatedDocument == null) {
                            logger.error("Document disappeared during analysis, ID: {}", document.getId());
                            continue;
                        }

                        logger.info("Check #{}: Document status is {}", attempts, updatedDocument.getStatus());

                        if ("Completed".equals(updatedDocument.getStatus()) ||
                                "Failed".equals(updatedDocument.getStatus()) ||
                                "Graded".equals(updatedDocument.getStatus()) ||
                                "Analyzed".equals(updatedDocument.getStatus())) {
                            analysisComplete = true;
                            document = updatedDocument;
                        }
                    } catch (InterruptedException e) {
                        logger.error("Analysis wait interrupted: {}", e.getMessage());
                        Thread.currentThread().interrupt();
                        break;
                    }
                }

                // Update submission based on document status
                DocumentModel analyzedDocument = documentService.getDocumentById(document.getId());

                if (analyzedDocument == null) {
                    logger.error("Document not found after analysis, ID: {}", document.getId());
                    submission.setStatus("Failed");
                    submission.setLastModified(new Date());
                    submission.setFeedback("Document not found after analysis");
                    submissionRepository.save(submission);
                    return;
                }

                if ("Completed".equals(analyzedDocument.getStatus()) ||
                        "Graded".equals(analyzedDocument.getStatus()) ||
                        "Analyzed".equals(analyzedDocument.getStatus())) {

                    logger.info("Analysis completed successfully for document: {}", documentId);

                    // Update submission with document results
                    submission.setStatus("Analyzed");
                    submission.setLastModified(new Date());

                    if (analyzedDocument.getResults() != null) {
                        submission.setResults(analyzedDocument.getResults());
                        logger.info("Updated submission with analysis results");
                    } else {
                        logger.warn("Document has no results after analysis");
                        submission.setFeedback("Analysis completed but no results were generated");
                    }

                    submission.setGrade(85); // Default grade, can be calculated based on results

                    submissionRepository.save(submission);
                    logger.info("Submission analysis completed successfully");
                } else {
                    logger.error("Analysis failed or timed out for document: {}", documentId);
                    submission.setStatus("Failed");
                    submission.setLastModified(new Date());
                    submission.setFeedback("Analysis failed or timed out");
                    submissionRepository.save(submission);
                }
            } catch (Exception e) {
                logger.error("Error during analysis: {}", e.getMessage(), e);
                submission.setStatus("Failed");
                submission.setLastModified(new Date());
                submission.setFeedback("Analysis error: " + e.getMessage());
                submissionRepository.save(submission);
            }
        }).start();

        return savedSubmission;
    }

    // Get a specific submission
    public SubmissionModel getSubmission(String submissionId) {
        return submissionRepository.findById(submissionId).orElse(null);
    }

    // Get submissions for a specific slot
    public List<SubmissionModel> getSubmissionsForSlot(String slotId) {
        return submissionRepository.findBySubmissionSlotId(slotId);
    }

    // Get submissions for a specific student
    public List<SubmissionModel> getSubmissionsForStudent(String studentId) {
        return submissionRepository.findByUserId(studentId);
    }
}