package com.example.demo.controllers;

import com.example.demo.models.CourseModel;
import com.example.demo.models.User;
import com.example.demo.services.CourseService;
import com.example.demo.services.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class CourseController {

    private static final Logger logger = LoggerFactory.getLogger(CourseController.class);

    @Autowired
    private CourseService courseService;

    @Autowired
    private UserService userService;

    @GetMapping("/courses")
    public ResponseEntity<?> getCourses() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication.getPrincipal().equals("anonymousUser")) {
                logger.error("No authenticated user found");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            String userId = authentication.getName();
            logger.info("Fetching courses for user: {}", userId);

            // Try to find the user by both email and ID
            User user = userService.findByEmail(userId);
            if (user == null) {
                user = userService.findById(userId);
            }

            if (user == null) {
                logger.error("User not found with ID/email: {}", userId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            List<CourseModel> courses;
            String role = user.getRole();
            logger.info("User role: {}", role);

            // Return different courses based on user role
            switch (role) {
                case "STUDENT":
                    courses = courseService.getCoursesForStudent(user.getId());
                    logger.info("Found {} courses for student", courses.size());
                    break;
                case "PROFESSOR":
                    courses = courseService.getCoursesForTeacher(user.getId());
                    logger.info("Found {} courses for professor", courses.size());
                    break;
                case "ADMIN":
                    courses = courseService.getAllCourses();
                    logger.info("Found {} courses for admin", courses.size());
                    break;
                default:
                    logger.warn("Unknown role '{}' for user {}", role, user.getId());
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Invalid user role"));
            }

            return ResponseEntity.ok(courses);
        } catch (Exception e) {
            logger.error("Error fetching courses: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch courses: " + e.getMessage()));
        }
    }

    @GetMapping("/courses/{id}")
    public ResponseEntity<?> getCourseById(@PathVariable String id) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication.getPrincipal().equals("anonymousUser")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            CourseModel course = courseService.getCourseById(id);
            if (course == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Course not found"));
            }

            return ResponseEntity.ok(course);
        } catch (Exception e) {
            logger.error("Error fetching course with ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch course: " + e.getMessage()));
        }
    }
}