package com.example.demo.controllers;

import com.example.demo.models.CourseModel;
import com.example.demo.models.SubmissionModel;
import com.example.demo.services.CourseService;
import com.example.demo.services.SubmissionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
    public ResponseEntity<?> getTeacherSubmissions() {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String teacherId = authentication.getName();
            logger.info("Fetching submissions for teacher: {}", teacherId);

            List<SubmissionModel> submissions = submissionService.getSubmissionsForTeacher(teacherId);
            return ResponseEntity.ok(submissions);
        } catch (Exception e) {
            logger.error("Error fetching teacher submissions", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch submissions: " + e.getMessage()));
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

            List<SubmissionModel> submissions = submissionService.getSubmissionsForCourse(courseId);
            return ResponseEntity.ok(submissions);
        } catch (Exception e) {
            logger.error("Error fetching course submissions", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch submissions: " + e.getMessage()));
        }
    }
} 