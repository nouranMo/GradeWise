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

@RestController
@RequestMapping("/admin-api")
@CrossOrigin(origins = {
    "http://localhost:3000", 
    "http://206.189.60.118", 
    "http://206.189.60.118:80", 
    "https://206.189.60.118"
}, allowCredentials = "true", 
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
    
    @Autowired
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

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
     * Delete a user
     */
    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable String userId) {
        try {
            User user = userService.findById(userId);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }
            
            // Prevent deleting admin users
            if (user.getRole() != null && user.getRole().equals("ROLE_ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Cannot delete admin users"));
            }
            
            // Direct implementation to delete the user from MongoDB
            try {
                // Log the user object to help debugging
                logger.info("Deleting user: {}", user);
                
                // Try the most basic approach first - delete directly with the entity
                try {
                    mongoTemplate.remove(user);
                    logger.info("User deleted successfully using entity removal");
                    return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
                } catch (Exception entityRemoveException) {
                    logger.warn("Entity removal failed: {}, trying query approach", entityRemoveException.getMessage());
                    
                    // Try with a query as backup
                    org.springframework.data.mongodb.core.query.Query query = 
                        new org.springframework.data.mongodb.core.query.Query();
                    
                    // Build a list of criteria to use with the orOperator
                    java.util.List<org.springframework.data.mongodb.core.query.Criteria> criteriaList = 
                        new java.util.ArrayList<>();
                    
                    // Add ID criteria 
                    criteriaList.add(
                        org.springframework.data.mongodb.core.query.Criteria.where("id").is(userId)
                    );
                    
                    // Add _id criteria if it looks like a valid ObjectId
                    if (userId.matches("[0-9a-fA-F]{24}")) {
                        try {
                            org.bson.types.ObjectId objectId = new org.bson.types.ObjectId(userId);
                            criteriaList.add(
                                org.springframework.data.mongodb.core.query.Criteria.where("_id").is(objectId)
                            );
                            logger.info("Added ObjectId criteria");
                        } catch (Exception e) {
                            logger.warn("Could not convert to ObjectId: {}", e.getMessage());
                        }
                    }
                    
                    // Also try by email if available
                    if (user.getEmail() != null) {
                        criteriaList.add(
                            org.springframework.data.mongodb.core.query.Criteria.where("email").is(user.getEmail())
                        );
                        logger.info("Added email criteria");
                    }
                    
                    // Convert the list to an array for orOperator
                    org.springframework.data.mongodb.core.query.Criteria[] criteriaArray = 
                        criteriaList.toArray(new org.springframework.data.mongodb.core.query.Criteria[criteriaList.size()]);
                    
                    query.addCriteria(
                        new org.springframework.data.mongodb.core.query.Criteria().orOperator(criteriaArray)
                    );
                    
                    logger.info("Executing MongoDB query with {} criteria", criteriaList.size());
                    mongoTemplate.remove(query, User.class);
                    logger.info("User deleted successfully using query removal");
                }
                
                return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
            } catch (Exception e) {
                logger.error("Error deleting user with MongoDB: {}", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Failed to delete user from database: " + e.getMessage()));
            }
        } catch (Exception e) {
            logger.error("Error in user deletion process: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to process user deletion: " + e.getMessage()));
        }
    }

    /**
     * Delete a course
     */
    @DeleteMapping("/courses/{courseId}")
    public ResponseEntity<?> deleteCourse(@PathVariable String courseId) {
        try {
            logger.info("Attempting to delete course with ID or code: {}", courseId);
            
            // The actual ID we'll use for deletion (might be different from the path variable)
            String deletionId = courseId;
            
            // First try to find the course by ID
            CourseModel course = courseService.getCourseById(courseId);
            
            // If not found by ID, try to find by course code
            if (course == null) {
                logger.info("Course not found by ID, attempting to find by code");
                // Assuming there's a method to find by code, or we need to get all courses and filter
                List<CourseModel> allCourses = courseService.getAllCourses();
                course = allCourses.stream()
                    .filter(c -> courseId.equals(c.getCode()))
                    .findFirst()
                    .orElse(null);
                
                if (course != null) {
                    logger.info("Found course by code: {}, with ID: {}", courseId, course.getId());
                    deletionId = course.getId(); // Use the actual ID for deletion
                }
            }
            
            if (course == null) {
                logger.warn("Course not found for deletion: {}", courseId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Course not found"));
            }
            
            // Try to delete with both the service method and direct MongoDB access for backup
            try {
                // First try using the service method
                try {
                    courseService.deleteCourse(deletionId);
                    logger.info("Course deleted successfully via service method");
                } catch (Exception e) {
                    logger.warn("Service method failed, falling back to direct MongoDB removal: {}", e.getMessage());
                    
                    // Create a query that tries both id and _id fields
                    org.springframework.data.mongodb.core.query.Query query = 
                        new org.springframework.data.mongodb.core.query.Query();
                    
                    // Build a list of criteria to use with the orOperator
                    java.util.List<org.springframework.data.mongodb.core.query.Criteria> criteriaList = 
                        new java.util.ArrayList<>();
                    
                    // Add ID criteria
                    criteriaList.add(
                        org.springframework.data.mongodb.core.query.Criteria.where("id").is(deletionId)
                    );
                    
                    // Add _id criteria if it looks like a valid ObjectId
                    if (deletionId.matches("[0-9a-fA-F]{24}")) {
                        try {
                            org.bson.types.ObjectId objectId = new org.bson.types.ObjectId(deletionId);
                            criteriaList.add(
                                org.springframework.data.mongodb.core.query.Criteria.where("_id").is(objectId)
                            );
                            logger.info("Added ObjectId criteria for course deletion");
                        } catch (Exception objIdEx) {
                            logger.warn("Could not convert to ObjectId: {}", objIdEx.getMessage());
                        }
                    }
                    
                    // Also try by code if the original input looks like a course code
                    if (!courseId.equals(deletionId) && !courseId.matches("[0-9a-fA-F]{24}")) {
                        criteriaList.add(
                            org.springframework.data.mongodb.core.query.Criteria.where("code").is(courseId)
                        );
                        logger.info("Added code criteria for course deletion");
                    }
                    
                    // Convert the list to an array for orOperator
                    org.springframework.data.mongodb.core.query.Criteria[] criteriaArray = 
                        criteriaList.toArray(new org.springframework.data.mongodb.core.query.Criteria[criteriaList.size()]);
                    
                    query.addCriteria(
                        new org.springframework.data.mongodb.core.query.Criteria().orOperator(criteriaArray)
                    );
                    
                    logger.info("Executing MongoDB query with {} criteria for course deletion", criteriaList.size());
                    // Remove from MongoDB directly as a fallback
                    mongoTemplate.remove(query, "courses");
                    logger.info("Course deleted successfully via direct MongoDB access");
                }
                
                return ResponseEntity.ok(Map.of(
                    "message", "Course deleted successfully", 
                    "id", deletionId,
                    "originalInput", courseId
                ));
            } catch (Exception e) {
                logger.error("Error deleting course from database: {}", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Failed to delete course from database: " + e.getMessage()));
            }
        } catch (Exception e) {
            logger.error("Error processing course deletion: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to process course deletion: " + e.getMessage()));
        }
    }
} 