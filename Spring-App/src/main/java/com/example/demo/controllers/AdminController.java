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
} 