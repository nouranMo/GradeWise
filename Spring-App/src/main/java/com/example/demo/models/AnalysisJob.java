package com.example.demo.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "analysis_jobs")
public class AnalysisJob {
    
    public enum Status {
        CREATED, QUEUED, PROCESSING, COMPLETED, FAILED
    }
    
    @Id
    private String id;
    private String documentId;
    private String userId;
    private Status status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Map<String, Object> analysisOptions;
    private Map<String, Object> results;
    private String errorMessage;
    private boolean isSubmission;
    
    public AnalysisJob() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.status = Status.CREATED;
    }
    
    // Getters and setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getDocumentId() {
        return documentId;
    }
    
    public void setDocumentId(String documentId) {
        this.documentId = documentId;
    }
    
    public String getUserId() {
        return userId;
    }
    
    public void setUserId(String userId) {
        this.userId = userId;
    }
    
    public Status getStatus() {
        return status;
    }
    
    public void setStatus(Status status) {
        this.status = status;
        this.updatedAt = LocalDateTime.now();
    }
    
    public void setStatus(String statusStr) {
        try {
            this.status = Status.valueOf(statusStr);
        } catch (IllegalArgumentException e) {
            this.status = Status.CREATED; // Default status
        }
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public Map<String, Object> getAnalysisOptions() {
        return analysisOptions;
    }
    
    public void setAnalysisOptions(Map<String, Object> analysisOptions) {
        this.analysisOptions = analysisOptions;
    }
    
    public Map<String, Object> getResults() {
        return results;
    }
    
    public void setResults(Map<String, Object> results) {
        this.results = results;
    }
    
    public String getErrorMessage() {
        return errorMessage;
    }
    
    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
    
    public boolean isSubmission() {
        return isSubmission;
    }
    
    public void setIsSubmission(boolean isSubmission) {
        this.isSubmission = isSubmission;
    }
} 