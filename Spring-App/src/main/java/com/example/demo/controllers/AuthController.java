package com.example.demo.controllers;

import com.example.demo.models.User;
import com.example.demo.security.JwtTokenProvider;
import com.example.demo.services.UserService;
import jakarta.validation.Valid;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {
    "http://localhost:3000", 
    "http://206.189.60.118", 
    "http://206.189.60.118:80", 
    "https://206.189.60.118"
}, allowCredentials = "true")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private UserService userService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            logger.info("Login attempt for: " + loginRequest.getEmail());

            User user = userService.authenticateUser(loginRequest.getEmail(), loginRequest.getPassword());
            logger.info("User authenticated successfully: " + user.getEmail());

            // Generate JWT token using the provider
            String token = jwtTokenProvider.generateToken(user);
            logger.info("JWT token generated successfully");

            // Create response with user details and token
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Login successful");

            // Create user map safely handling null values
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId());
            userMap.put("email", user.getEmail());
            userMap.put("firstName", user.getFirstName() != null ? user.getFirstName() : "");
            userMap.put("lastName", user.getLastName() != null ? user.getLastName() : "");
            userMap.put("role", user.getRole() != null ? user.getRole() : "");

            response.put("user", userMap);
            response.put("token", token);
            response.put("status", "success");

            logger.info("Login response prepared successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Login error: " + e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Authentication failed"));
        }
    }

    // Add this method to generate a simple JWT token
    private String generateJwtToken(User user) {
        // This is a simple implementation - in production, use a proper JWT library
        String secretKey = "YourSuperSecretKeyThatIsAtLeast512BitsLongAndSecureEnoughForHS512Algorithm1234567890";

        long now = System.currentTimeMillis();
        long expirationTime = now + 86400000; // 24 hours

        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", user.getEmail());
        claims.put("id", user.getId());
        claims.put("role", user.getRole());
        claims.put("iat", now);
        claims.put("exp", expirationTime);

        // In a real implementation, you would use the JWT library to sign this
        // For now, we'll just create a simple encoded string
        String encodedClaims = Base64.getEncoder().encodeToString(claims.toString().getBytes());
        String encodedHeader = Base64.getEncoder().encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes());
        String signature = Base64.getEncoder().encodeToString(
                (encodedHeader + "." + encodedClaims + secretKey).getBytes());

        return encodedHeader + "." + encodedClaims + "." + signature;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            // Check if email already exists
            if (userService.findByEmail(registerRequest.getEmail()) != null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email already in use"));
            }

            User user = userService.registerUser(
                    registerRequest.getEmail(),
                    registerRequest.getPassword(),
                    registerRequest.getFirstName(),
                    registerRequest.getLastName(),
                    "STUDENT");

            // Generate JWT token
            String token = jwtTokenProvider.generateToken(user);

            // Return user info and token
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("user", user);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}