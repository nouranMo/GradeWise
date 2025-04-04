package com.example.demo.controllers;

import com.example.demo.models.User;
import com.example.demo.services.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Collections;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserService userService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody Map<String, String> loginRequest) {
        try {
            String email = loginRequest.get("email");
            String password = loginRequest.get("password");

            logger.info("Login attempt for user: {}", email);

            // Attempt authentication
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password));

            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Get user details
            User user = userService.findByEmail(email);

            logger.info("User authenticated successfully: {}", user.getEmail());

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Login successful");

            Map<String, Object> userData = new HashMap<>();
            userData.put("id", user.getId());
            userData.put("email", user.getEmail());
            userData.put("firstName", user.getFirstName());
            userData.put("lastName", user.getLastName());
            // Don't try to access roles since it doesn't exist

            response.put("user", userData);

            return ResponseEntity.ok(response);
        } catch (AuthenticationException e) {
            logger.error("Authentication failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("status", "error", "message", "Invalid email or password"));
        } catch (Exception e) {
            logger.error("Error during authentication: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Authentication failed: " + e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, Object> signUpRequest) {
        try {
            String email = (String) signUpRequest.get("email");
            String password = (String) signUpRequest.get("password");
            String firstName = (String) signUpRequest.get("firstName");
            String lastName = (String) signUpRequest.get("lastName");

            logger.info("Registration attempt for email: {}", email);

            // Check if email exists
            if (userService.findByEmail(email) != null) {
                logger.warn("Email {} is already in use", email);
                return ResponseEntity.badRequest()
                        .body(Map.of("status", "error", "message", "Email is already in use"));
            }

            // Create new user using the same pattern as in UserController
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setPassword(passwordEncoder.encode(password));
            newUser.setFirstName(firstName);
            newUser.setLastName(lastName);
            newUser.setEnabled(true);

            // Save the user
            User user = userService.save(newUser);

            logger.info("User registered successfully: {}", user.getEmail());

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "User registered successfully");

            Map<String, Object> userData = new HashMap<>();
            userData.put("id", user.getId());
            userData.put("email", user.getEmail());
            userData.put("firstName", user.getFirstName());
            userData.put("lastName", user.getLastName());

            response.put("user", userData);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Registration failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Registration failed: " + e.getMessage()));
        }
    }
}