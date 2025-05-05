package com.example.demo.controllers;

import com.example.demo.models.User;
import com.example.demo.services.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.PostConstruct;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.example.demo.models.CourseModel;
import com.example.demo.services.CourseService;
import java.util.ArrayList;

@RestController
@RequestMapping("/admin-api")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true", 
             allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
public class AdminController {

    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);
    
    @PostConstruct
    public void init() {
        logger.info("AdminController initialized");
        logger.info("Endpoints registered: /admin-api/users, /admin-api/update-role, /admin-api/test");
    }

    @Autowired
    private UserService userService;

    @Autowired
    private CourseService courseService;

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        try {
            // Add debug logging
            System.out.println("AdminController: Fetching all users for admin panel");
            System.out.println("Request received at: " + new java.util.Date());
            
            // Temporarily disable authentication check
            List<User> users = userService.findAllUsers();
            
            System.out.println("Found " + users.size() + " users");
            
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            System.out.println("Error fetching users: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/update-role")
    public ResponseEntity<?> updateUserRole(@RequestBody UpdateRoleRequest request) {
        try {
            // Temporarily disable admin check
            /*
            // Verify the requester is an admin
            User admin = userService.findByEmail(request.getAdminEmail());
            if (admin == null || !admin.getEmail().equals("admin@gmail.com")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Unauthorized access"));
            }
            */
            
            // Update the user's role
            User user = userService.findById(request.getUserId());
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
            }
            
            user.setRole(request.getNewRole());
            userService.save(user);
            
            return ResponseEntity.ok(Map.of("message", "Role updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/test")
    public ResponseEntity<?> testEndpoint() {
        return ResponseEntity.ok(Map.of("message", "Admin API is working!"));
    }

    /**
     * Get all courses
     */
    @GetMapping("/courses")
    public ResponseEntity<?> getAllCourses() {
        try {
            List<CourseModel> courses = courseService.getAllCourses();
            return ResponseEntity.ok(courses);
        } catch (Exception e) {
            logger.error("Error fetching courses", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch courses: " + e.getMessage()));
        }
    }

    /**
     * Create a new course
     */
    @PostMapping("/courses")
    public ResponseEntity<?> createCourse(@RequestBody CourseModel course) {
        try {
            CourseModel newCourse = courseService.createCourse(course);
            return ResponseEntity.ok(newCourse);
        } catch (Exception e) {
            logger.error("Error creating course", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create course: " + e.getMessage()));
        }
    }

    /**
     * Assign teacher to course
     */
    @PostMapping("/courses/{courseId}/teachers")
    public ResponseEntity<?> assignTeacherToCourse(
            @PathVariable String courseId,
            @RequestBody Map<String, String> request) {
        try {
            String teacherId = request.get("teacherId");
            if (teacherId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Teacher ID is required"));
            }
            
            CourseModel updatedCourse = courseService.assignTeacherToCourse(courseId, teacherId);
            return ResponseEntity.ok(updatedCourse);
        } catch (Exception e) {
            logger.error("Error assigning teacher to course", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to assign teacher to course: " + e.getMessage()));
        }
    }

    /**
     * Assign student to course
     */
    @PostMapping("/courses/{courseId}/students")
    public ResponseEntity<?> assignStudentToCourse(
            @PathVariable String courseId,
            @RequestBody Map<String, String> request) {
        try {
            String studentId = request.get("studentId");
            if (studentId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Student ID is required"));
            }
            
            CourseModel updatedCourse = courseService.assignStudentToCourse(courseId, studentId);
            return ResponseEntity.ok(updatedCourse);
        } catch (Exception e) {
            logger.error("Error assigning student to course", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to assign student to course: " + e.getMessage()));
        }
    }

    /**
     * Remove student from course
     */
    @DeleteMapping("/courses/{courseId}/students/{studentId}")
    public ResponseEntity<?> removeStudentFromCourse(
            @PathVariable String courseId,
            @PathVariable String studentId) {
        try {
            CourseModel updatedCourse = courseService.removeStudentFromCourse(courseId, studentId);
            return ResponseEntity.ok(updatedCourse);
        } catch (Exception e) {
            logger.error("Error removing student from course", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to remove student from course: " + e.getMessage()));
        }
    }

    /**
     * Remove teacher from course
     */
    @DeleteMapping("/courses/{courseId}/teachers/{teacherId}")
    public ResponseEntity<?> removeTeacherFromCourse(
            @PathVariable String courseId,
            @PathVariable String teacherId) {
        try {
            CourseModel updatedCourse = courseService.removeTeacherFromCourse(courseId, teacherId);
            return ResponseEntity.ok(updatedCourse);
        } catch (Exception e) {
            logger.error("Error removing teacher from course", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to remove teacher from course: " + e.getMessage()));
        }
    }

    /**
     * Assign multiple students to course
     */
    @PostMapping("/courses/{courseId}/students/batch")
    public ResponseEntity<?> assignMultipleStudentsToCourse(
            @PathVariable String courseId,
            @RequestBody Map<String, List<String>> request) {
        try {
            List<String> studentIds = request.get("studentIds");
            if (studentIds == null || studentIds.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Student IDs are required"));
            }
            
            List<CourseModel> updatedCourses = new ArrayList<>();
            for (String studentId : studentIds) {
                CourseModel updatedCourse = courseService.assignStudentToCourse(courseId, studentId);
                updatedCourses.add(updatedCourse);
            }
            
            return ResponseEntity.ok(updatedCourses.get(updatedCourses.size() - 1));
        } catch (Exception e) {
            logger.error("Error assigning students to course", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to assign students to course: " + e.getMessage()));
        }
    }

    /**
     * Delete a user
     */
    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable String userId) {
        try {
            userService.deleteUser(userId);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
        } catch (Exception e) {
            logger.error("Error deleting user", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete user: " + e.getMessage()));
        }
    }
} 