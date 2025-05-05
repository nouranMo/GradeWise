package com.example.demo.controllers;

import com.example.demo.models.CourseModel;
import com.example.demo.models.Submission;
import com.example.demo.models.SubmissionSlotModel;
import com.example.demo.services.CourseService;
import com.example.demo.services.SubmissionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher")
public class TeacherController {

    private static final Logger logger = LoggerFactory.getLogger(TeacherController.class);

    @Autowired
    private CourseService courseService;

    @Autowired
    private SubmissionService submissionService;

    /**
     * Get courses for the current teacher
     */
    @GetMapping("/courses")
    public ResponseEntity<?> getTeacherCourses() {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();
            logger.info("Fetching courses for teacher: {}", userId);

            List<CourseModel> courses = courseService.getCoursesForTeacher(userId);
            return ResponseEntity.ok(courses);
        } catch (Exception e) {
            logger.error("Error fetching teacher courses", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch courses: " + e.getMessage()));
        }
    }

    /**
     * Get submissions for the current teacher (only from their courses)
     */
    @GetMapping("/submissions")
    public ResponseEntity<?> getSubmissions(Authentication authentication) {
        try {
            String userId = authentication.getName();
            List<Submission> submissions = submissionService.getSubmissionsForTeacher(userId);
            return ResponseEntity.ok(submissions);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get submissions for a specific course (that the teacher teaches)
     */
    @GetMapping("/courses/{courseId}/submissions")
    public ResponseEntity<?> getCourseSubmissions(@PathVariable String courseId) {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String teacherId = authentication.getName();
            logger.info("Fetching submissions for course: {} by teacher: {}", courseId, teacherId);

            // Verify teacher teaches this course
            CourseModel course = courseService.getCourseById(courseId);
            if (course == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Course not found"));
            }

            if (!course.getTeacherIds().contains(teacherId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You don't have permission to access this course"));
            }

            List<Submission> submissions = submissionService.getSubmissionsForCourse(courseId);
            return ResponseEntity.ok(submissions);
        } catch (Exception e) {
            logger.error("Error fetching course submissions", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch submissions: " + e.getMessage()));
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

    @PostMapping("/submissions/slots")
    public ResponseEntity<?> createSubmissionSlot(@RequestBody SubmissionSlotModel submissionSlot,
            Authentication authentication) {
        try {
            String userId = authentication.getName();
            SubmissionSlotModel newSlot = submissionService.createSubmissionSlot(submissionSlot, userId);
            return ResponseEntity.ok(newSlot);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/submissions/slots")
    public ResponseEntity<?> getSubmissionSlots(Authentication authentication) {
        try {
            String userId = authentication.getName();
            List<SubmissionSlotModel> slots = submissionService.getSubmissionSlotsByProfessor(userId);
            return ResponseEntity.ok(slots);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/submissions/slots/{id}")
    public ResponseEntity<?> deleteSubmissionSlot(@PathVariable String id, Authentication authentication) {
        try {
            String userId = authentication.getName();
            submissionService.deleteSubmissionSlot(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}