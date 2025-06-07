package com.example.demo.controllers;

import com.example.demo.dto.LoginRequest;
import com.example.demo.models.User;
import com.example.demo.security.JwtTokenProvider;
import com.example.demo.services.UserService;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import javax.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = {
    "http://localhost:3000", 
    "http://206.189.60.118", 
    "http://206.189.60.118:80", 
    "https://206.189.60.118"
}, allowCredentials = "true")
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
                    .authorities(Collections.singletonList(new SimpleGrantedAuthority("USER")))
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

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        try {
            if (authentication == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            String userId = authentication.getName();

            // Try to find the user by both email and ID
            User user = userService.findByEmail(userId);
            if (user == null) {
                user = userService.findById(userId);
            }

            if (user == null) {

                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateCurrentUser(@RequestBody User user, Authentication authentication) {
        try {
            String userId = authentication.getName();
            User existingUser = userService.findById(userId);
            if (existingUser == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
            }

            // Update only the allowed fields
            if (user.getFirstName() != null) {
                existingUser.setFirstName(user.getFirstName());
            }
            if (user.getLastName() != null) {
                existingUser.setLastName(user.getLastName());
            }
            if (user.getPassword() != null) {
                existingUser.setPassword(passwordEncoder.encode(user.getPassword()));
            }

            User updatedUser = userService.save(existingUser);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));

        }
    }
}
