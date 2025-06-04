package com.example.demo.controllers;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/test")
@CrossOrigin(origins = {
    "http://localhost:3000", 
    "http://206.189.60.118", 
    "http://206.189.60.118:80", 
    "https://206.189.60.118"
}, allowCredentials = "true")
public class TestController {

    @GetMapping("/public")
    public ResponseEntity<?> publicEndpoint() {
        return ResponseEntity.ok(Map.of("message", "This is a public endpoint"));
    }

    @GetMapping("/admin")
    public ResponseEntity<?> adminEndpoint() {
        return ResponseEntity.ok(Map.of("message", "This is an admin endpoint"));
    }
} 