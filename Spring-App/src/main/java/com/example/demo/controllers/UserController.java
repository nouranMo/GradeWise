package com.example.demo.controllers;

import com.example.demo.models.User;
import com.example.demo.services.UserService;

import jakarta.servlet.http.HttpServletRequest;

import com.example.demo.security.JwtTokenProvider;
import com.example.demo.dto.LoginRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import javax.validation.Valid;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            System.out.println("Registering user: " + user.getEmail());

            // Check email domain
            if (!user.getEmail().endsWith("@miuegypt.edu.eg") && !user.getEmail().equals("admin@gmail.com")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Only @miuegypt.edu.eg email addresses are allowed"));
            }

            // Check if user already exists
            if (userService.findByEmail(user.getEmail()) != null) {
                System.out.println("User already exists: " + user.getEmail());
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Email already registered"));
            }

            // Create new user
            User newUser = new User();
            newUser.setEmail(user.getEmail());
            newUser.setPassword(passwordEncoder.encode(user.getPassword()));
            newUser.setFirstName(user.getFirstName());
            newUser.setLastName(user.getLastName());
            newUser.setEnabled(true);

            // Save user
            User savedUser = userService.save(newUser);
            System.out.println("User registered successfully: " + savedUser.getEmail());

            // Create UserDetails
            UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                    savedUser.getEmail(),
                    savedUser.getPassword(),
                    Collections.emptyList());

            // Generate JWT token
            String token = jwtTokenProvider.generateTokenFromUserDetails(userDetails);

            // Return response with token
            return ResponseEntity.ok(Map.of(
                    "message", "Registration successful",
                    "token", token,
                    "user", Map.of(
                            "email", savedUser.getEmail(),
                            "firstName", savedUser.getFirstName(),
                            "lastName", savedUser.getLastName())));
        } catch (Exception e) {
            System.out.println("Error during registration: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            // Authenticate user
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Get user details
            User authenticatedUser = userService.authenticateUser(loginRequest.getEmail(), loginRequest.getPassword());

            // Create UserDetails object
            UserDetails userDetails = org.springframework.security.core.userdetails.User
                    .withUsername(authenticatedUser.getEmail())
                    .password(authenticatedUser.getPassword())
                    .authorities(Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")))
                    .build();

            // Generate JWT token
            String token = jwtTokenProvider.generateTokenFromUserDetails(userDetails);

            // Return response with token
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("user", authenticatedUser);

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Invalid email or password");
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication authentication) {
        try {
            if (authentication == null) {
                System.out.println("Authentication is null");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }

            String email = authentication.getName();
            System.out.println("Attempting to fetch profile for email: " + email);

            User user = userService.findByEmail(email);

            if (user == null) {
                System.out.println("No user found for email: " + email);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            System.out.println("Found user: " + user.getFirstName() + " " + user.getLastName());

            Map<String, Object> profile = new HashMap<>();
            profile.put("firstName", user.getFirstName());
            profile.put("lastName", user.getLastName());
            profile.put("email", user.getEmail());
            profile.put("role", user.getRole());

            System.out.println("Returning profile: " + profile);
            return ResponseEntity.ok(profile);

        } catch (Exception e) {
            System.out.println("Error in profile endpoint: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error fetching profile: " + e.getMessage()));
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestBody Map<String, String> updates,
            Authentication authentication,
            HttpServletRequest request) { // Add this parameter
        try {
            // Add debug logging
            System.out.println("==== Debug Profile Update ====");
            System.out.println("Updates received: " + updates);
            System.out.println("Authentication object: " + authentication);

            // Get the Authorization header directly to check if it's being received
            String authHeader = request.getHeader("Authorization");
            System.out.println("Authorization header: " + authHeader);

            if (authentication == null) {
                System.out.println("Authentication is null - checking SecurityContext");
                authentication = SecurityContextHolder.getContext().getAuthentication();
                System.out.println("Authentication from SecurityContext: " + authentication);
            }

            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }

            String email = authentication.getName();
            System.out.println("User email: " + email);

            User user = userService.findByEmail(email);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            // Update allowed fields
            if (updates.containsKey("firstName")) {
                user.setFirstName(updates.get("firstName"));
            }
            if (updates.containsKey("lastName")) {
                user.setLastName(updates.get("lastName"));
            }

            // Save updated user
            User updatedUser = userService.save(user);

            // Return updated profile
            Map<String, Object> profile = new HashMap<>();
            profile.put("firstName", updatedUser.getFirstName());
            profile.put("lastName", updatedUser.getLastName());
            profile.put("email", updatedUser.getEmail());
            profile.put("role", updatedUser.getRole());

            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            System.out.println("Error in updateProfile: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error updating profile: " + e.getMessage()));
        }
    }
}
