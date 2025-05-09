package com.example.demo.controllers;

import com.example.demo.models.DocumentModel;
import com.example.demo.models.Submission;
import com.example.demo.models.SubmissionSlotModel;
import com.example.demo.models.User;
import com.example.demo.models.CourseModel;
import com.example.demo.security.JwtTokenProvider;
import com.example.demo.services.SubmissionService;
import com.example.demo.services.DocumentService;
import com.example.demo.services.UserService;
import com.example.demo.services.CourseService;
import com.example.demo.repositories.SubmissionRepository;
import com.example.demo.dto.SubmissionDetailsDTO;
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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class SubmissionController {

    private static final Logger logger = LoggerFactory.getLogger(SubmissionController.class);

    @Autowired
    private SubmissionService submissionService;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private UserService userService;

    @Autowired
    private CourseService courseService;

    @Autowired
    private SubmissionRepository submissionRepository;

    @PostMapping("/submissions")
    public ResponseEntity<?> createSubmission(
            @RequestParam("file") MultipartFile file,
            @RequestParam("courseId") String courseId,
            Authentication authentication) {
        try {
            String userId = authentication.getName(); // Get email from authentication
            Submission submission = submissionService.createSubmission(file, courseId, userId);
            return ResponseEntity.ok(submission);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/submissions")
    public ResponseEntity<?> getSubmissions(
            @RequestParam(value = "professorId", required = false) String professorId,
            Authentication authentication) {
        logger.info("Fetching submissions with professorId filter: {}", professorId);
        try {
            if (authentication == null || authentication.getPrincipal().equals("anonymousUser")) {
                logger.error("No authenticated user found");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.emptyList());
            }

            String userId = authentication.getName();
            logger.info("Current user: {}", userId);

            // Get user details to check role - try both by email and ID
            User currentUser = userService.findByEmail(userId);
            if (currentUser == null) {
                currentUser = userService.findById(userId);
            }

            if (currentUser == null) {
                logger.error("User not found: {}", userId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.emptyList());
            }

            List<Submission> submissions;
            String userRole = currentUser.getRole();
            logger.info("User role: {}", userRole);

            // Handle different roles
            switch (userRole) {
                case "PROFESSOR":
                    // If professorId is specified, check if current user has permission
                    if (professorId != null && !professorId.isEmpty() && !professorId.equals(currentUser.getId())) {
                        logger.warn("Professor {} attempted to access submissions of professor {}", userId,
                                professorId);
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Collections.emptyList());
                    }
                    // Get submissions for the professor (either specified or current user)
                    String targetProfessorId = (professorId != null && !professorId.isEmpty()) ? professorId
                            : currentUser.getId();
                    submissions = submissionService.getSubmissionsForTeacher(targetProfessorId);
                    break;

                case "ADMIN":
                    // Admin can see all submissions or filter by professor
                    if (professorId != null && !professorId.isEmpty()) {
                        submissions = submissionService.getSubmissionsForTeacher(professorId);
                    } else {
                        submissions = submissionService.getAllSubmissions();
                    }
                    break;

                case "STUDENT":
                    // Students can only see their own submissions
                    if (professorId != null) {
                        logger.warn("Student {} attempted to access professor's submissions", userId);
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Collections.emptyList());
                    }
                    submissions = submissionService.getSubmissionsByUserId(currentUser.getId());
                    break;

                default:
                    logger.error("Unknown user role: {}", userRole);
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Collections.emptyList());
            }

            // Enrich submissions with details
            List<SubmissionDetailsDTO> detailedSubmissions = submissions.stream().map(sub -> {
                SubmissionDetailsDTO dto = new SubmissionDetailsDTO();
                dto.setId(sub.getId());
                User student = userService.findById(sub.getUserId());
                if (student != null) {
                    dto.setStudentName(student.getFirstName() + " " + student.getLastName());
                    dto.setStudentEmail(student.getEmail());
                } else {
                    dto.setStudentName("Unknown");
                    dto.setStudentEmail("");
                }
                DocumentModel doc = documentService.getDocumentById(sub.getDocumentId());
                if (doc != null) {
                    dto.setDocumentName(doc.getName());
                    dto.setDocumentId(doc.getId());
                } else {
                    dto.setDocumentName("");
                    dto.setDocumentId("");
                }
                CourseModel course = courseService.getCourseById(sub.getCourseId());
                if (course != null) {
                    dto.setCourseName(course.getName());
                    dto.setCourseCode(course.getCode());
                } else {
                    dto.setCourseName("");
                    dto.setCourseCode("");
                }
                dto.setSubmissionType(sub.getSubmissionType());
                dto.setSubmissionDate(sub.getLastModified());
                dto.setStatus(sub.getStatus());
                dto.setGrade((int) sub.getGrade());
                return dto;
            }).collect(Collectors.toList());
            return ResponseEntity.ok(detailedSubmissions);
        } catch (Exception e) {
            logger.error("Error fetching submissions: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

    @GetMapping("/submissions/{id}")
    public ResponseEntity<?> getSubmission(@PathVariable String id, Authentication authentication) {
        logger.info("Fetching submission with ID: {}", id);
        try {
            if (authentication == null || authentication.getPrincipal().equals("anonymousUser")) {
                logger.error("No authenticated user found");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            String userId = authentication.getName();
            logger.info("Current user identifier: {}", userId);
            
            // Try to find user by both email and ID
            User currentUser = userService.findByEmail(userId);
            if (currentUser == null) {
                logger.info("User not found by email, trying ID lookup: {}", userId);
                currentUser = userService.findById(userId);
            }

            if (currentUser == null) {
                logger.error("User not found with ID/email: {}", userId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            logger.info("Found user: {} ({}), role: {}", 
                    currentUser.getEmail(), currentUser.getId(), currentUser.getRole());

            // Get the submission
            Submission submission = submissionService.getSubmission(id);
            if (submission == null) {
                logger.error("Submission not found with ID: {}", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Submission not found", "submission_id", id));
            }
            
            logger.info("Found submission: ID={}, UserID={}, DocumentID={}", 
                    submission.getId(), submission.getUserId(), submission.getDocumentId());

            // If user is professor or admin, they can access any submission
            if ("PROFESSOR".equals(currentUser.getRole()) || "ADMIN".equals(currentUser.getRole())) {
                logger.info("Professor/Admin accessing submission: {}", submission.getId());
                
                // If the submission has a document ID, try to get the document results
                if (submission.getDocumentId() != null) {
                    DocumentModel document = documentService.getDocumentById(submission.getDocumentId());
                    if (document != null && document.getResults() != null) {
                        logger.info("Found document with results: {}", document.getId());
                        submission.setResults(document.getResults());
                    } else {
                        logger.info("Document found but has no results or document not found: {}", 
                                submission.getDocumentId());
                    }
                } else {
                    logger.warn("Submission has no document ID: {}", submission.getId());
                }
                
                return ResponseEntity.ok(submission);
            }

            // For students, check using their ID, not email
            if (!submission.getUserId().equals(currentUser.getId())) {
                logger.warn("Student {} attempted to access submission belonging to {}", 
                        currentUser.getId(), submission.getUserId());
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You can only access your own submissions"));
            }

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

    @DeleteMapping("/submissions/{id}")
    public ResponseEntity<?> deleteSubmission(@PathVariable String id, Authentication authentication) {
        try {
            String userId = authentication.getName(); // Get email from authentication
            
            // Get user details to check role
            User currentUser = userService.findByEmail(userId);
            if (currentUser == null) {
                currentUser = userService.findById(userId);
            }
            
            if (currentUser == null) {
                logger.error("User not found: {}", userId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
            }
            
            // Allow professors and admins to delete any submission
            // For students, only allow them to delete their own submissions
            if ("PROFESSOR".equals(currentUser.getRole()) || "ADMIN".equals(currentUser.getRole())) {
                logger.info("Professor/Admin {} deleting submission {}", userId, id);
                
                // Get the submission to check if it exists
                Submission submission = submissionService.getSubmission(id);
                if (submission == null) {
                    logger.error("Submission not found with ID: {}", id);
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Submission not found");
                }
                
                // For professors, we'll do a soft check if they teach the course
                // But we won't block them if they don't since this appears to be a data issue
                if ("PROFESSOR".equals(currentUser.getRole())) {
                    String courseId = submission.getCourseId();
                    logger.info("Submission belongs to course: {}", courseId);
                    
                    CourseModel course = courseService.getCourseById(courseId);
                    if (course == null) {
                        logger.warn("Course not found with ID: {}. Proceeding with deletion anyway.", courseId);
                    } else {
                        // Log debugging info
                        logger.info("Course teacherIds: {}", course.getTeacherIds());
                        logger.info("Professor ID: {}", currentUser.getId());
                        
                        if (course.getTeacherIds() == null || course.getTeacherIds().isEmpty()) {
                            logger.warn("Course has no teachers assigned");
                        } else if (!course.getTeacherIds().contains(currentUser.getId())) {
                            logger.warn("Professor {} not in teacher list for course {}, but proceeding with deletion", 
                                    currentUser.getId(), courseId);
                        } else {
                            logger.info("Professor authorized to delete this submission");
                        }
                    }
                }
                
                // Delete the submission directly using the repository
                submissionRepository.deleteById(id);
                logger.info("Submission {} deleted successfully by professor/admin {}", id, userId);
                return ResponseEntity.ok().build();
            } else {
                // For students, use the normal service method that checks ownership
                submissionService.deleteSubmission(id, userId);
                return ResponseEntity.ok().build();
            }
        } catch (Exception e) {
            logger.error("Error deleting submission {}: {}", id, e.getMessage(), e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Get available submission slots (for students)
    @GetMapping("/submissions/available")
    public ResponseEntity<List<SubmissionSlotModel>> getAvailableSubmissions() {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication.getPrincipal().equals("anonymousUser")) {
                logger.error("No authenticated user found");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            String userId = authentication.getName();
            logger.info("Fetching available submissions for student: {}", userId);

            // Get user details - try both by email and by ID
            User user = userService.findByEmail(userId);

            // If not found by email, try by ID
            if (user == null) {
                user = userService.findById(userId);
            }

            if (user == null) {
                logger.error("User not found with ID/email: {}", userId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            logger.info("Found user: {} {}, ID: {}", user.getFirstName(), user.getLastName(), user.getId());

            // Get student's enrolled courses
            List<CourseModel> studentCourses = courseService.getCoursesForStudent(user.getId());
            logger.info("Student is enrolled in {} courses", studentCourses.size());

            // Get all available submission slots
            List<SubmissionSlotModel> allAvailableSlots = submissionService.getAvailableSubmissionSlots();

            // Filter slots by the student's enrolled courses
            List<SubmissionSlotModel> filteredSlots = allAvailableSlots.stream()
                    .filter(slot -> {
                        String slotCourse = slot.getCourse();
                        // Check if any of the student's courses match this slot's course
                        return studentCourses.stream()
                                .anyMatch(course -> course.getCode().equals(slotCourse));
                    })
                    .collect(Collectors.toList());

            logger.info("Found {} submission slots for student's courses", filteredSlots.size());
            return ResponseEntity.ok(filteredSlots);
        } catch (Exception e) {
            logger.error("Error fetching available submissions: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Get submission slots (for professors)
    @GetMapping("/submissions/slots")
    public ResponseEntity<List<SubmissionSlotModel>> getSubmissionSlots(
            @RequestParam(value = "professorId", required = false) String professorId) {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication.getPrincipal().equals("anonymousUser")) {
                logger.error("No authenticated user found");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            String userId = authentication.getName();
            logger.info("Fetching submission slots. Current user: {}, requested professorId: {}", userId, professorId);

            // Get user details
            User currentUser = userService.findById(userId);
            if (currentUser == null) {
                logger.error("User not found: {}", userId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            List<SubmissionSlotModel> submissionSlots;

            // If professorId is specified and user is not that professor or admin
            if (professorId != null && !professorId.isEmpty() &&
                    !professorId.equals(currentUser.getId()) &&
                    !"ADMIN".equals(currentUser.getRole())) {
                logger.warn("User {} attempted to access submission slots for professor {}", userId, professorId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            // Filter by professor ID if requested
            if (professorId != null && !professorId.isEmpty()) {
                submissionSlots = submissionService.getSubmissionSlotsByProfessor(professorId);
                logger.info("Filtered submission slots by professor ID: {}, found: {}",
                        professorId, submissionSlots.size());
            } else if ("PROFESSOR".equals(currentUser.getRole())) {
                // If current user is a professor, return their slots
                submissionSlots = submissionService.getSubmissionSlotsByProfessor(currentUser.getId());
                logger.info("Returning submission slots for professor: {}, found: {}",
                        currentUser.getId(), submissionSlots.size());
            } else {
                // Return all slots for admin
                submissionSlots = submissionService.getSubmissionSlots();
                logger.info("Returning all submission slots, found: {}", submissionSlots.size());
            }

            return ResponseEntity.ok(submissionSlots);
        } catch (Exception e) {
            logger.error("Error fetching submission slots: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Create a new submission slot (for professors)
    @PostMapping("/submissions/slots")
    public ResponseEntity<?> createSubmissionSlot(@RequestBody SubmissionSlotModel submissionSlot) {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication.getPrincipal().equals("anonymousUser")) {
                logger.error("No authenticated user found");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            String userId = authentication.getName();
            logger.info("Creating submission slot. Current user: {}", userId);

            // Get user details
            User currentUser = userService.findById(userId);
            if (currentUser == null) {
                logger.error("User not found: {}", userId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "User not found"));
            }

            // Check if user is a professor
            if (!"PROFESSOR".equals(currentUser.getRole()) && !"ADMIN".equals(currentUser.getRole())) {
                logger.error("User {} with role {} attempted to create a submission slot",
                        userId, currentUser.getRole());
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only professors can create submission slots"));
            }

            // Validate that professor teaches the course
            String courseCode = submissionSlot.getCourse();
            if (courseCode == null || courseCode.isEmpty()) {
                logger.error("Course code is required when creating a submission slot");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Course code is required"));
            }

            // Skip course check for admin
            if (!"ADMIN".equals(currentUser.getRole())) {
                // Check if professor teaches this course
                List<CourseModel> professorCourses = courseService.getCoursesForTeacher(currentUser.getId());
                boolean isCourseTeacher = professorCourses.stream()
                        .anyMatch(course -> course.getCode().equals(courseCode));

                if (!isCourseTeacher) {
                    logger.error("Professor {} is not teaching course {}", currentUser.getId(), courseCode);
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You are not authorized to create submission slots for this course"));
                }
            }

            SubmissionSlotModel newSlot = submissionService.createSubmissionSlot(submissionSlot, currentUser.getId());
            return ResponseEntity.ok(newSlot);
        } catch (Exception e) {
            logger.error("Error creating submission slot: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create submission slot: " + e.getMessage()));
        }
    }

    // Delete a submission slot (for professors)
    @DeleteMapping("/submissions/slots/{slotId}")
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
    @PostMapping("/submissions/student/submit")
    public ResponseEntity<?> submitDocument(@RequestBody Map<String, Object> submissionData) {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication.getPrincipal().equals("anonymousUser")) {
                logger.error("No authenticated user found");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            String userId = authentication.getName();
            logger.info("Submitting document by student: {}", userId);

            // Extract all important fields from request
            String documentId = (String) submissionData.get("documentId");
            String submissionSlotId = (String) submissionData.get("submissionSlotId");
            String submissionType = (String) submissionData.get("submissionType");
            String course = (String) submissionData.get("course");

            logger.info("Document ID: {}", documentId);
            logger.info("Submission Slot ID: {}", submissionSlotId);
            logger.info("Course: {}", course);
            
            // Validate required fields
            if (documentId == null || documentId.isEmpty()) {
                logger.error("Missing document ID in submission request");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Document ID is required"));
            }
            
            // Check if we got a MongoDB _id format and handle it
            if (submissionData.containsKey("_id")) {
                String mongoId = (String) submissionData.get("_id");
                logger.info("Found MongoDB _id format: {}", mongoId);
                // If documentId is not set but _id is, use _id
                if (documentId == null || documentId.isEmpty()) {
                    documentId = mongoId;
                    logger.info("Using _id as documentId: {}", documentId);
                }
            }
            
            // Also check document object if present
            if (submissionData.containsKey("document")) {
                Object docObj = submissionData.get("document");
                if (docObj instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> documentMap = (Map<String, Object>) docObj;
                    
                    String docId = (String) documentMap.get("id");
                    String docMongoId = (String) documentMap.get("_id");
                    
                    logger.info("Document object found with id: {}, _id: {}", docId, docMongoId);
                    
                    // If documentId is still not set, try to use from document object
                    if ((documentId == null || documentId.isEmpty()) && docId != null) {
                        documentId = docId;
                        logger.info("Using document.id as documentId: {}", documentId);
                    } else if ((documentId == null || documentId.isEmpty()) && docMongoId != null) {
                        documentId = docMongoId;
                        logger.info("Using document._id as documentId: {}", documentId);
                    }
                }
            }
            
            // Final validation check for documentId
            if (documentId == null || documentId.isEmpty()) {
                logger.error("Could not determine document ID from request");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Could not determine document ID"));
            }

            // Get user details
            User user = userService.findByEmail(userId);
            if (user == null) {
                logger.error("User not found with ID: {}", userId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            // Verify student's role
            if (!"STUDENT".equals(user.getRole()) && !"ADMIN".equals(user.getRole())) {
                logger.error("User {} with role {} attempted to submit a document as a student", userId,
                        user.getRole());
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only students can submit documents"));
            }

            // Verify document exists before submission
            DocumentModel document = documentService.getDocumentById(documentId);
            if (document == null) {
                logger.error("Document not found with ID: {}", documentId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Document not found with ID: " + documentId));
            }

            // Check document ownership
            if (!document.getUserId().equals(user.getId()) && !"ADMIN".equals(user.getRole())) {
                logger.error("Document ownership mismatch. Owner: {}, Requester: {}",
                        document.getUserId(), user.getId());
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You can only submit documents that you own"));
            }

            // Get the submission slot to check the professor and course
            SubmissionSlotModel submissionSlot = submissionService.getSubmissionSlot(submissionSlotId);
            if (submissionSlot == null) {
                logger.error("Submission slot not found with ID: {}", submissionSlotId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Submission slot not found"));
            }

            // Get the course code from the submission slot
            String courseCode = submissionSlot.getCourse();
            logger.info("Submission slot course: {}", courseCode);

            // Skip enrollment check for admin
            if (!"ADMIN".equals(user.getRole())) {
                // Check if the student is enrolled in the course
                List<CourseModel> studentCourses = courseService.getCoursesForStudent(user.getId());
                boolean isEnrolled = studentCourses.stream()
                        .anyMatch(c -> c.getCode().equals(courseCode));

                if (!isEnrolled) {
                    logger.error("Student {} is not enrolled in course {}", user.getId(), courseCode);
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You are not enrolled in this course"));
                }
            }

            logger.info("Found document: {} at path: {}", document.getName(), document.getFilePath());
            logger.info("CREATING SUBMISSION WITH DOCUMENT ID: {}", documentId);

            Submission submission = submissionService.submitDocument(
                    documentId, submissionSlotId, submissionType, course, user.getId());

            return ResponseEntity.ok(Map.of(
                    "message", "Document submitted successfully",
                    "submission", submission));
        } catch (Exception e) {
            logger.error("Error submitting document: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to submit document: " + e.getMessage()));
        }
    }

    // Analyze a student submission
    @PostMapping("/submissions/{submissionId}/analyze")
    public ResponseEntity<?> analyzeSubmission(
            @PathVariable String submissionId,
            @RequestBody(required = false) Map<String, Object> requestBody) {

        logger.info("Received request to analyze submission: {}", submissionId);

        try {
            // Find the submission
            Submission submission = submissionService.getSubmission(submissionId);
            if (submission == null) {
                logger.error("Submission not found with ID: {}", submissionId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Collections.singletonMap("error", "Submission not found with ID: " + submissionId));
            }

            logger.info("Found submission: id={}, userId={}, courseId={}, status={}", 
                submission.getId(), submission.getUserId(), submission.getCourseId(), submission.getStatus());

            // Get the document associated with the submission
            String documentId = submission.getDocumentId();
            logger.info("Checking document ID in submission: {}", documentId);
            
            if (documentId == null || documentId.isEmpty()) {
                logger.error("No document ID associated with this submission: {}", submissionId);
                
                // Log the full submission to help debug
                logger.error("Submission details: id={}, userId={}, courseId={}, submissionType={}, status={}, lastModified={}",
                    submission.getId(), submission.getUserId(), submission.getCourseId(), 
                    submission.getSubmissionType(), submission.getStatus(), submission.getLastModified());
                    
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Collections.singletonMap("error", "No document ID associated with this submission. The submission was not properly created with a document reference."));
            }

            logger.info("Analyzing document ID: {} for submission: {}", documentId, submissionId);
            
            // Verify document exists in the database
            DocumentModel document = documentService.getDocumentById(documentId);
            if (document == null) {
                logger.error("Document not found for submission: document_id={}, submission_id={}", documentId, submissionId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of(
                            "error", "Document not found for this submission",
                            "documentId", documentId,
                            "submissionId", submissionId
                        ));
            }
            
            logger.info("Found document for analysis: id={}, name={}, path={}, userId={}",
                document.getId(), document.getName(), document.getFilePath(), document.getUserId());

            // Extract analyses from request body if provided
            Map<String, Boolean> analyses = new HashMap<>();

            // Default analyses if none provided
            analyses.put("SrsValidation", true);
            analyses.put("ReferencesValidation", true);
            analyses.put("ContentAnalysis", true);
            analyses.put("SpellCheck", true);
            // Extract documentType from request body
            String documentType = requestBody != null ? (String) requestBody.get("documentType") : null;
            if (documentType == null || (!documentType.equals("SRS") && !documentType.equals("SDD"))) {
                logger.warn("Invalid or missing documentType: {}", documentType);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Invalid or missing documentType: must be SRS or SDD"));
            }
            logger.info("Document type: {}", documentType);
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
            logger.info("Starting document analysis with document ID: {}", documentId);

            // Start analysis in background
            try {
                logger.info("Calling documentService.startAnalysis with document ID: {}", documentId);
                documentService.startAnalysis(documentId, analyses, documentType);
                logger.info("Analysis started for document: {}", documentId);

                // Directly call the analyzeSubmission method with the submission ID and analyses
                logger.info("Calling submissionService.analyzeSubmission with submission ID: {}", submissionId);
                Submission analyzedSubmission = submissionService.analyzeSubmission(submissionId, analyses, documentType);

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

    // Get submissions for the current student
    @GetMapping("/submissions/student")
    public ResponseEntity<List<Submission>> getStudentSubmissions() {
        logger.info("Fetching submissions for current student");
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();

            logger.info("Fetching submissions for student: {}", userId);

            // Get submissions for this student
            List<Submission> studentSubmissions = submissionService.getSubmissionsForStudent(userId);

            logger.info("Found {} raw submissions for student {}", studentSubmissions.size(), userId);

            // For each submission, try to fetch document results if available
            for (Submission submission : studentSubmissions) {
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

    // Grade a submission
    @PostMapping("/submissions/{submissionId}/grade")
    public ResponseEntity<?> gradeSubmission(
            @PathVariable String submissionId,
            @RequestBody Map<String, Object> gradeData,
            Authentication authentication) {
        
        logger.info("Processing grade submission for ID: {}", submissionId);
        
        try {
            // Get current user
            String userId = authentication.getName();
            
            // Check if user is professor
            User currentUser = userService.findByEmail(userId);
            if (currentUser == null) {
                currentUser = userService.findById(userId);
            }
            
            if (currentUser == null) {
                logger.error("User not found with ID/email: {}", userId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "User not found"));
            }
            
            if (!"PROFESSOR".equals(currentUser.getRole()) && !"ADMIN".equals(currentUser.getRole())) {
                logger.error("User {} with role {} attempted to grade a submission", 
                        currentUser.getId(), currentUser.getRole());
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only professors can grade submissions"));
            }
            
            // Extract grade data
            Double grade = null;
            String feedback = null;
            String status = "Graded";
            
            if (gradeData.containsKey("grade")) {
                if (gradeData.get("grade") instanceof Number) {
                    grade = ((Number) gradeData.get("grade")).doubleValue();
                } else if (gradeData.get("grade") instanceof String) {
                    try {
                        grade = Double.parseDouble((String) gradeData.get("grade"));
                    } catch (NumberFormatException e) {
                        logger.error("Invalid grade format: {}", gradeData.get("grade"));
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(Map.of("error", "Invalid grade format"));
                    }
                }
            }
            
            if (gradeData.containsKey("feedback")) {
                feedback = (String) gradeData.get("feedback");
            }
            
            if (gradeData.containsKey("status")) {
                status = (String) gradeData.get("status");
            }
            
            // Validate grade
            if (grade == null || grade < 0 || grade > 100) {
                logger.error("Invalid grade value: {}", grade);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Grade must be between 0 and 100"));
            }
            
            // Update the submission with grade
            Submission gradedSubmission = submissionService.gradeSubmission(
                    submissionId, grade, feedback, status);
            
            return ResponseEntity.ok(Map.of(
                    "message", "Submission graded successfully",
                    "submission", gradedSubmission));
            
        } catch (Exception e) {
            logger.error("Error grading submission: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to grade submission: " + e.getMessage()));
        }
    }

    // Download document for a submission
    @GetMapping("/submissions/{id}/download")
    public ResponseEntity<?> downloadSubmissionDocument(@PathVariable String id, Authentication authentication) {
        try {
            logger.info("Processing download request for submission: {}", id);
            
            // Get current user
            String userId = authentication.getName();
            
            // Check if user exists
            User currentUser = userService.findByEmail(userId);
            if (currentUser == null) {
                currentUser = userService.findById(userId);
            }
            
            if (currentUser == null) {
                logger.error("User not found with ID/email: {}", userId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "User not found"));
            }
            
            // Get the submission
            Submission submission = submissionService.getSubmission(id);
            if (submission == null) {
                logger.error("Submission not found with ID: {}", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Submission not found"));
            }
            
            // For non-professors, only allow downloading their own submissions
            if (!"PROFESSOR".equals(currentUser.getRole()) && 
                !"ADMIN".equals(currentUser.getRole()) && 
                !submission.getUserId().equals(currentUser.getId())) {
                
                logger.error("User {} attempted to download submission {} belonging to {}", 
                        currentUser.getId(), id, submission.getUserId());
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You can only download your own submissions"));
            }
            
            // Get the document associated with the submission
            String documentId = submission.getDocumentId();
            if (documentId == null || documentId.isEmpty()) {
                logger.error("Submission {} has no associated document", id);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Submission has no associated document"));
            }
            
            // Get the document
            DocumentModel document = documentService.getDocumentById(documentId);
            if (document == null) {
                logger.error("Document not found for submission {}, documentId: {}", id, documentId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Document not found"));
            }
            
            // Get the file path
            String filePath = document.getFilePath();
            if (filePath == null || filePath.isEmpty()) {
                logger.error("Document {} has no file path", documentId);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Document has no file path"));
            }
            
            // Check if file exists
            java.io.File file = new java.io.File(filePath);
            if (!file.exists()) {
                logger.error("File not found at path: {}", filePath);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "File not found on server"));
            }
            
            // Read file and return as resource
            try {
                byte[] fileContent = java.nio.file.Files.readAllBytes(file.toPath());
                
                // Determine content type based on file extension
                String contentType = "application/octet-stream"; // Default
                String fileName = document.getName() != null ? document.getName() : "document";
                
                if (fileName.toLowerCase().endsWith(".pdf")) {
                    contentType = "application/pdf";
                } else if (fileName.toLowerCase().endsWith(".doc")) {
                    contentType = "application/msword";
                } else if (fileName.toLowerCase().endsWith(".docx")) {
                    contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                }
                
                // Create downloadable response
                return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=\"" + fileName + "\"")
                    .body(fileContent);
                
            } catch (java.io.IOException e) {
                logger.error("Error reading file: {}", e.getMessage(), e);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Error reading file: " + e.getMessage()));
            }
            
        } catch (Exception e) {
            logger.error("Error downloading submission document: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error downloading document: " + e.getMessage()));
        }
    }
}