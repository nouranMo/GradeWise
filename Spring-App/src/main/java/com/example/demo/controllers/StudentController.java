package com.example.demo.controllers;

import com.example.demo.models.DocumentModel;
import com.example.demo.models.SubmissionModel;
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

    // Get student documents
    @GetMapping("/documents")
    public ResponseEntity<List<DocumentModel>> getStudentDocuments() {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();
            logger.info("Fetching documents for student: {}", userId);

            List<DocumentModel> documents = documentService.getUserDocuments(userId);
            return ResponseEntity.ok(documents);
        } catch (Exception e) {
            logger.error("Error fetching student documents", e);
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

            // Save document without analysis preferences (will be analyzed later when submitted)
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
     * Submit a document to a course
     */
    @PostMapping("/submit")
    public ResponseEntity<?> submitDocument(@RequestBody Map<String, Object> submissionData) {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();
            logger.info("Processing submission for student: {}", userId);

            String documentId = (String) submissionData.get("documentId");
            String submissionSlotId = (String) submissionData.get("submissionSlotId");
            String submissionType = (String) submissionData.get("submissionType");
            String courseId = (String) submissionData.get("courseId");

            logger.info("Document ID: {}", documentId);
            logger.info("Submission Slot ID: {}", submissionSlotId);
            logger.info("Course ID: {}", courseId);

            // Verify document exists before submission
            DocumentModel document = documentService.getDocumentById(documentId);
            if (document == null) {
                logger.error("Document not found with ID: {}", documentId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Collections.singletonMap("error", "Document not found with ID: " + documentId));
            }

            logger.info("Found document: {} at path: {}", document.getName(), document.getFilePath());

            // Verify student is enrolled in the course
            CourseModel course = courseService.getCourseById(courseId);
            if (course == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Course not found"));
            }
            
            if (!course.getStudentIds().contains(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You are not enrolled in this course"));
            }

            // Submit the document
            SubmissionModel submission = submissionService.submitDocument(
                    documentId, submissionSlotId, submissionType, courseId, userId);

            return ResponseEntity.ok(Map.of(
                    "message", "Document submitted successfully",
                    "submission", submission));
        } catch (Exception e) {
            logger.error("Error submitting document", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to submit document: " + e.getMessage()));
        }
    }

    /**
     * Get submissions for the current student (filtered by their courses)
     */
    @GetMapping("/submissions")
    public ResponseEntity<List<SubmissionModel>> getStudentSubmissions() {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();
            logger.info("Fetching submissions for student: {}", userId);

            List<SubmissionModel> submissions = submissionService.getSubmissionsForStudent(userId);
            return ResponseEntity.ok(submissions);
        } catch (Exception e) {
            logger.error("Error fetching student submissions", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
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
}