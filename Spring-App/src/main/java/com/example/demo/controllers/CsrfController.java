package com.example.demo.controllers;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/csrf")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class CsrfController {

    @GetMapping("/test")
    public ResponseEntity<?> testGet() {
        return ResponseEntity.ok(Map.of("message", "GET request successful"));
    }

    @PostMapping("/test")
    public ResponseEntity<?> testPost() {
        return ResponseEntity.ok(Map.of("message", "POST request successful"));
    }
} 