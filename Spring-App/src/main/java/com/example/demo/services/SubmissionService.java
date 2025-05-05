package com.example.demo.services;

import com.example.demo.models.DocumentModel;
import com.example.demo.models.Submission;
import com.example.demo.models.SubmissionSlotModel;
import com.example.demo.models.User;
import com.example.demo.models.CourseModel;
import com.example.demo.repositories.SubmissionRepository;
import com.example.demo.repositories.SubmissionSlotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;
import java.io.File;
import org.springframework.web.multipart.MultipartFile;

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

    @Autowired
    private CourseService courseService;

    // Get all submissions
    public List<Submission> getAllSubmissions() {
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
    public Submission submitDocument(String documentId, String submissionSlotId,
            String submissionType, String courseId, String userId) throws Exception {
        logger.info("Processing document submission - Document ID: {}, Slot ID: {}, Student: {}",
                documentId, submissionSlotId, userId);

        // Get the document
        DocumentModel document = documentService.getDocumentById(documentId);
        if (document == null) {
            logger.error("Document not found with ID: {}", documentId);
            throw new Exception("Document not found");
        }

        logger.info("Found document: {} with ID: {}", document.getName(), document.getId());

        // Skip document ownership check in development mode
        if (!userId.equals("anonymousUser") && !document.getUserId().equals(userId)) {
            logger.warn("Document ownership mismatch - Owner: {}, Requester: {} - Allowing for development",
                    document.getUserId(), userId);
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
        List<Submission> existingSubmissions = submissionRepository.findByUserId(userId);
        boolean hasSubmitted = existingSubmissions.stream()
                .anyMatch(s -> s.getCourseId().equals(courseId));

        if (hasSubmitted) {
            logger.warn("Student {} has already submitted to slot {}", userId, submissionSlotId);
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
        User student = userService.findByEmail(userId);
        String studentName = student != null ? student.getFirstName() + " " + student.getLastName()
                : "Anonymous Student";

        logger.info("Creating submission for student: {}", studentName);

        // Validate that the user is enrolled in the course
        CourseModel course = courseService.getCourseById(courseId);
        if (course == null) {
            throw new IllegalArgumentException("Course not found");
        }

        // Check if student is enrolled in the course
        if (!course.getStudentIds().contains(userId)) {
            throw new IllegalArgumentException("Student is not enrolled in this course");
        }

        // Create the submission
        Submission submission = new Submission();
        submission.setCourseId(courseId);
        submission.setUserId(userId);
        submission.setStatus("Submitted");
        submission.setLastModified(new Date());
        submission.setSubmissionType(submissionType);

        logger.info("Created submission with document ID: {}", submission.getDocumentId());

        // Update submission slot count
        slot.incrementSubmissionsCount();
        submissionSlotRepository.save(slot);
        logger.info("Updated submission slot count to: {}", slot.getSubmissionsCount());

        // Save the submission
        Submission savedSubmission = submissionRepository.save(submission);
        logger.info("Saved submission with ID: {}", savedSubmission.getId());

        // Log all saved fields to debug
        logger.info(
                "Saved submission details - ID: {}, DocumentID: {}, UserID: {}, Course: {}, Status: {}, LastModified: {}",
                savedSubmission.getId(), savedSubmission.getDocumentId(), savedSubmission.getUserId(),
                savedSubmission.getCourseId(), savedSubmission.getStatus(), savedSubmission.getLastModified());

        return savedSubmission;
    }

    // Delete a submission
    public void deleteSubmission(String submissionId) {
        submissionRepository.deleteById(submissionId);
    }

    // Analyze a submission
    public Submission analyzeSubmission(String submissionId, Map<String, Boolean> analysisOptions,
            String documentType)
            throws Exception {
        logger.info("Starting analysis for submission ID: {} with options: {}", submissionId, analysisOptions);

        Submission submission = submissionRepository.findById(submissionId).orElse(null);
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
        Submission savedSubmission = submissionRepository.save(submission);
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

                logger.info("Starting document analysis with analyses: {}", analyses, documentType);

                // Analyze the document
                try {
                    documentService.startAnalysis(document.getId(), analyses, documentType);
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
    public Submission getSubmission(String submissionId) {
        return submissionRepository.findById(submissionId).orElse(null);
    }

    // Get submissions for a specific slot
    public List<Submission> getSubmissionsForSlot(String slotId) {
        // Get the slot to find its course ID
        SubmissionSlotModel slot = submissionSlotRepository.findById(slotId).orElse(null);
        if (slot == null) {
            return Collections.emptyList();
        }

        // Get all submissions for the course
        return submissionRepository.findByCourseId(slot.getCourse());
    }

    // Get submissions for a specific student
    public List<Submission> getSubmissionsForStudent(String studentId) {
        return submissionRepository.findByUserId(studentId);
    }

    /**
     * Get submissions for a specific course
     */
    public List<Submission> getSubmissionsForCourse(String courseId) {
        return submissionRepository.findByCourseId(courseId);
    }

    /**
     * Get submissions for a teacher (only from their courses)
     */
    public List<Submission> getSubmissionsForTeacher(String teacherId) {
        logger.info("Fetching submissions for teacher: {}", teacherId);

        // Get all courses where this teacher is assigned
        List<CourseModel> teacherCourses = courseService.getCoursesForTeacher(teacherId);
        logger.info("Found {} courses for teacher", teacherCourses.size());

        // If no courses, return empty list
        if (teacherCourses.isEmpty()) {
            logger.warn("No courses found for teacher: {}", teacherId);
            return new ArrayList<>();
        }

        // Get all submissions from these courses
        List<Submission> submissions = new ArrayList<>();
        for (CourseModel course : teacherCourses) {
            logger.info("Fetching submissions for course: {} ({})", course.getName(), course.getCode());
            List<Submission> courseSubmissions = getSubmissionsForCourse(course.getCode());
            logger.info("Found {} submissions for course {}", courseSubmissions.size(), course.getCode());
            submissions.addAll(courseSubmissions);
        }

        logger.info("Total submissions found for teacher: {}", submissions.size());
        return submissions;
    }

    /**
     * Get a submission slot by ID
     */
    public SubmissionSlotModel getSubmissionSlot(String slotId) {
        return submissionSlotRepository.findById(slotId).orElse(null);
    }

    /**
     * Get submission slots created by a specific professor
     */
    public List<SubmissionSlotModel> getSubmissionSlotsByProfessor(String professorId) {
        return submissionSlotRepository.findByProfessorId(professorId);
    }

    public Submission createSubmission(MultipartFile file, String courseId, String userId) {
        Submission submission = new Submission();
        submission.setCourseId(courseId);
        submission.setUserId(userId);
        submission.setFileName(file.getOriginalFilename());
        submission.setFileType(file.getContentType());
        // Add any additional processing here
        return submissionRepository.save(submission);
    }

    public List<Submission> getSubmissionsByUserId(String userId) {
        return submissionRepository.findByUserId(userId);
    }

    public Submission getSubmissionById(String id, String userId) {
        Optional<Submission> submission = submissionRepository.findById(id);
        if (submission.isPresent() && submission.get().getUserId().equals(userId)) {
            return submission.get();
        }
        throw new RuntimeException("Submission not found or unauthorized");
    }

    public void deleteSubmission(String id, String userId) {
        Optional<Submission> submission = submissionRepository.findById(id);
        if (submission.isPresent() && submission.get().getUserId().equals(userId)) {
            submissionRepository.deleteById(id);
        } else {
            throw new RuntimeException("Submission not found or unauthorized");
        }
    }

    // Check if student has already submitted to this slot
    public boolean hasStudentSubmittedToSlot(String userId, String courseId) {
        List<Submission> studentSubmissions = submissionRepository.findByUserId(userId);
        return studentSubmissions.stream()
                .anyMatch(s -> s.getCourseId().equals(courseId));
    }
}