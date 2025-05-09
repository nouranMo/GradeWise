package com.example.demo.controllers;

import com.example.demo.models.DocumentModel;
import com.example.demo.models.Submission;
import com.example.demo.models.SubmissionSlotModel;
import com.example.demo.models.CourseModel;
import com.example.demo.services.DocumentService;
import com.example.demo.services.SubmissionService;
import com.example.demo.services.CourseService;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.example.demo.models.User;
import com.example.demo.services.UserService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/student")
@CrossOrigin(origins = "http://localhost:3000", allowedHeaders = "*", methods = { RequestMethod.GET, RequestMethod.POST,
        RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS }, allowCredentials = "true")
public class StudentController {

    private static final Logger logger = LoggerFactory.getLogger(StudentController.class);

    @Autowired
    private DocumentService documentService;

    @Autowired
    private SubmissionService submissionService;

    @Autowired
    private CourseService courseService;

    @Autowired
    private UserService userService;

    // Get student documents
    @GetMapping("/documents")
    public ResponseEntity<?> getStudentDocuments() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication.getPrincipal().equals("anonymousUser")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            String userId = authentication.getName();
            logger.info("Fetching documents for student: {}", userId);

            // Try to find the user by both email and ID
            User user = userService.findByEmail(userId);
            if (user == null) {
                user = userService.findById(userId);
            }

            if (user == null) {
                logger.error("User not found with ID/email: {}", userId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            logger.info("Found user: {} {}, ID: {}", user.getFirstName(), user.getLastName(), user.getId());

            List<DocumentModel> documents = documentService.getUserDocuments(user.getId());
            return ResponseEntity.ok(documents);
        } catch (Exception e) {
            logger.error("Error fetching student documents: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Upload document (student)
    @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadStudentDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "name", required = false) String name) {
        try {
            logger.info("Received student file upload request");
            logger.info("File name: {}", file.getOriginalFilename());
            logger.info("File size: {}", file.getSize());

            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
            }

            // Get current user
            String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
            logger.info("Current student: {}", currentUserEmail);

            // Save document without analysis preferences (will be analyzed later when
            // submitted)
            DocumentModel document = documentService.saveDocumentWithoutAnalysis(
                    currentUserEmail,
                    file,
                    name != null ? name : file.getOriginalFilename());

            logger.info("Student document saved with ID: {}", document.getId());
            logger.info("Document saved at path: {}", document.getFilePath());

            // Ensure the document has a status that makes it visible
            if (document.getStatus() == null) {
                document.setStatus("Uploaded");
                documentService.saveDocument(document.getName(), null, null, document.getUserId());
                logger.info("Updated document status to 'Uploaded'");
            }

            // Return response with document
            return ResponseEntity.ok(Map.of(
                    "message", "Document uploaded successfully",
                    "document", document));
        } catch (Exception e) {
            logger.error("Error uploading student document: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload document: " + e.getMessage()));
        }
    }

    // Delete document (student)
    @DeleteMapping("/documents/{documentId}")
    public ResponseEntity<?> deleteStudentDocument(@PathVariable String documentId) {
        try {
            // Get current user
            String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();

            // Check ownership
            DocumentModel document = documentService.getDocumentById(documentId);
            if (document == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Document not found"));
            }

            if (!document.getUserId().equals(currentUserEmail)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You don't have permission to delete this document"));
            }

            // Delete document
            documentService.deleteDocument(documentId);

            return ResponseEntity.ok(Map.of("message", "Document deleted successfully"));
        } catch (Exception e) {
            System.out.println("Error deleting student document: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete document: " + e.getMessage()));
        }
    }

    // Get document results (for a graded/analyzed student document)
    @GetMapping("/documents/{documentId}/results")
    public ResponseEntity<?> getDocumentResults(@PathVariable String documentId) {
        try {
            // Get current user
            String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();

            // Find document
            DocumentModel document = documentService.getDocumentById(documentId);
            if (document == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Document not found"));
            }

            // Check ownership
            if (!document.getUserId().equals(currentUserEmail)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You don't have permission to view this document's results"));
            }

            // Check if document has results
            if (document.getStatus() == null ||
                    (!document.getStatus().equals("Analyzed") &&
                            !document.getStatus().equals("Graded") &&
                            !document.getStatus().equals("Completed"))) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Document has not been analyzed yet"));
            }

            // Get results
            Map<String, Object> results = document.getResults();
            if (results == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "No results found for this document"));
            }

            return ResponseEntity.ok(results);
        } catch (Exception e) {
            System.out.println("Error fetching document results: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch document results: " + e.getMessage()));
        }
    }

    /**
     * Submit a document to a submission slot
     */
    @PostMapping("/submissions/slots/{slotId}/submit")
    public ResponseEntity<?> submitDocumentToSlot(
            @PathVariable String slotId,
            @RequestBody Map<String, Object> submissionData) {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();
            logger.info("Processing submission for student: {}", userId);

            String documentId = (String) submissionData.get("documentId");
            String submissionType = (String) submissionData.get("submissionType");

            logger.info("Document ID: {}", documentId);
            logger.info("Submission Slot ID: {}", slotId);

            // Get user details
            User user = userService.findByEmail(userId);
            if (user == null) {
                user = userService.findById(userId);
            }

            if (user == null) {
                logger.error("User not found with ID/email: {}", userId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            // Verify document exists before submission
            DocumentModel document = documentService.getDocumentById(documentId);
            if (document == null) {
                logger.error("Document not found with ID: {}", documentId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Collections.singletonMap("error", "Document not found with ID: " + documentId));
            }

            // Check document ownership
            if (!document.getUserId().equals(user.getId()) && !"ADMIN".equals(user.getRole())) {
                logger.error("Document ownership mismatch. Owner: {}, Requester: {}",
                        document.getUserId(), user.getId());
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You can only submit documents that you own"));
            }

            logger.info("Found document: {} at path: {}", document.getName(), document.getFilePath());

            // Get the submission slot
            SubmissionSlotModel slot = submissionService.getSubmissionSlot(slotId);
            if (slot == null) {
                logger.error("Submission slot not found with ID: {}", slotId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Submission slot not found"));
            }

            // Get the course from the slot
            String courseId = slot.getCourse();
            if (courseId == null || courseId.isEmpty()) {
                logger.error("No course associated with submission slot: {}", slotId);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "No course associated with this submission slot"));
            }

            logger.info("Using course from slot: {}", courseId);

            // Verify student is enrolled in the course
            CourseModel course = courseService.getCourseById(courseId);
            if (course == null) {
                // Course doesn't exist, create it
                logger.info("Course not found, creating new course: {}", courseId);
                course = new CourseModel();
                course.setId(courseId);
                course.setCode(courseId);
                course.setName(courseId); // Using course code as name for now
                course.setDescription("Course created automatically from submission");
                course = courseService.createCourse(course);
                logger.info("Created new course: {}", courseId);
            }

            // Ensure student is enrolled in the course
            if (!course.getStudentIds().contains(user.getId()) && !"ADMIN".equals(user.getRole())) {
                logger.info("Student {} not enrolled in course {}, enrolling now", user.getId(), courseId);
                course = courseService.assignStudentToCourse(courseId, user.getId());
            }

            // Check if student has already submitted
            boolean hasSubmitted = submissionService.hasStudentSubmittedToSlot(user.getId(), courseId);
            if (hasSubmitted) {
                logger.warn("Student {} has already submitted to course {}", user.getId(), courseId);
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "You have already submitted to this assignment"));
            }

            // Submit the document
            Submission submission = submissionService.submitDocument(
                    documentId, slotId, submissionType, courseId, user.getId());

            return ResponseEntity.ok(Map.of(
                    "message", "Document submitted successfully",
                    "submission", submission));
        } catch (Exception e) {
            logger.error("Error submitting document: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to submit document: " + e.getMessage()));
        }
    }

    /**
     * Get submission slots available for the student
     */
    @GetMapping("/submissions/available-slots")
    public ResponseEntity<?> getAvailableSubmissionSlots() {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();
            logger.info("Fetching available submission slots for student: {}", userId);

            // Get user details
            User user = userService.findByEmail(userId);
            if (user == null) {
                user = userService.findById(userId);
            }

            if (user == null) {
                logger.error("User not found with ID/email: {}", userId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            // Use the new service method that correctly handles submission status by slot ID
            List<Map<String, Object>> enhancedSlots = submissionService.getAvailableSlotsWithSubmissionStatus(user.getId());
            
            // Filter by enrolled courses
            List<CourseModel> studentCourses = courseService.getCoursesForStudent(user.getId());
            logger.info("Student is enrolled in {} courses", studentCourses.size());
            
            // Filter the slots by student's enrolled courses
            List<Map<String, Object>> filteredSlots = enhancedSlots.stream()
                .filter(slotMap -> {
                    SubmissionSlotModel slot = (SubmissionSlotModel) slotMap.get("slot");
                    String slotCourse = slot.getCourse();
                    
                    // Check if student is enrolled in this course
                    return studentCourses.stream()
                            .anyMatch(course -> course.getCode().equals(slotCourse));
                })
                .collect(Collectors.toList());

            logger.info("Found {} filtered submission slots for student", filteredSlots.size());
            return ResponseEntity.ok(filteredSlots);
        } catch (Exception e) {
            logger.error("Error fetching available submission slots: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch available submission slots: " + e.getMessage()));
        }
    }

    /**
     * Get submissions for the current student (filtered by their courses)
     */
    @GetMapping("/submissions")
    public ResponseEntity<?> getSubmissions(Authentication authentication) {
        try {
            String userId = authentication.getName();
            List<Submission> submissions = submissionService.getSubmissionsByUserId(userId);
            return ResponseEntity.ok(submissions);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get courses for the current student
     */
    @GetMapping("/courses")
    public ResponseEntity<?> getStudentCourses() {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();
            logger.info("Fetching courses for student: {}", userId);

            List<CourseModel> courses = courseService.getCoursesForStudent(userId);
            return ResponseEntity.ok(courses);
        } catch (Exception e) {
            logger.error("Error fetching student courses", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch courses: " + e.getMessage()));
        }
    }

    @PostMapping("/submissions")
    public ResponseEntity<?> createSubmission(
            @RequestParam("file") MultipartFile file,
            @RequestParam("courseId") String courseId,
            Authentication authentication) {
        try {
            String userId = authentication.getName();
            Submission submission = submissionService.createSubmission(file, courseId, userId);
            return ResponseEntity.ok(submission);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/submissions/{id}")
    public ResponseEntity<?> getSubmission(@PathVariable String id, Authentication authentication) {
        try {
            String userId = authentication.getName();
            Submission submission = submissionService.getSubmissionById(id, userId);
            return ResponseEntity.ok(submission);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/submissions/{id}")
    public ResponseEntity<?> deleteSubmission(@PathVariable String id, Authentication authentication) {
        try {
            String userId = authentication.getName();
            submissionService.deleteSubmission(id, userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/submissions/available")
    public ResponseEntity<?> getAvailableSubmissions(Authentication authentication) {
        logger.info("Redirecting to new available-slots endpoint");
        return getAvailableSubmissionSlots();
    }
}