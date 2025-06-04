package com.example.demo.controllers;

import com.example.demo.models.AnalysisJob;
import com.example.demo.models.UserModel;
import com.example.demo.services.AnalysisJobService;
import com.example.demo.services.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analysis-jobs")
@CrossOrigin(origins = {
    "http://localhost:3000", 
    "http://206.189.60.118", 
    "http://206.189.60.118:80", 
    "https://206.189.60.118"
}, allowCredentials = "true")
public class AnalysisJobController {
    
    private static final Logger logger = LoggerFactory.getLogger(AnalysisJobController.class);
    
    @Autowired
    private AnalysisJobService analysisJobService;
    
    @Autowired
    private UserService userService;
    
    @GetMapping("/{jobId}/status")
    public ResponseEntity<?> getJobStatus(@PathVariable String jobId) {
        try {
            AnalysisJob job = analysisJobService.getJobById(jobId);
            if (job == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Collections.singletonMap("error", "Job not found"));
            }
            
            return ResponseEntity.ok(Map.of(
                "status", job.getStatus(),
                "results", job.getResults() != null ? job.getResults() : Collections.emptyMap(),
                "errorMessage", job.getErrorMessage() != null ? job.getErrorMessage() : ""
            ));
        } catch (Exception e) {
            logger.error("Error getting job status: " + jobId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Error getting job status: " + e.getMessage()));
        }
    }

    /**
     * Get all analysis jobs for a document
     */
    @GetMapping("/document/{documentId}")
    public ResponseEntity<?> getJobsByDocumentId(@PathVariable String documentId, Authentication authentication) {
        try {
            // Get jobs for document without filtering by user
            List<AnalysisJob> jobs = analysisJobService.getJobsByDocumentId(documentId);
            
            // Only filter by user if we can find the user
            if (authentication != null) {
                try {
                    UserModel user = userService.getUserByEmail(authentication.getName());
                    if (user != null) {
                        // Filter jobs to only show those created by the current user
                        jobs = jobs.stream()
                                .filter(job -> job.getUserId().equals(user.getId()))
                                .collect(Collectors.toList());
                    }
                } catch (Exception e) {
                    logger.warn("Could not filter jobs by user: " + e.getMessage());
                    // Continue with unfiltered jobs
                }
            }
            
            return ResponseEntity.ok(jobs);
        } catch (Exception e) {
            logger.error("Error getting jobs for document: " + documentId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Error getting jobs: " + e.getMessage()));
        }
    }
} 