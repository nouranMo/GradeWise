package com.example.demo.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;
import java.util.Map;

@Document(collection = "documents")
public class DocumentModel {
    @Id
    private String id;
    private String userId;
    private String name;
    private String originalFilename;
    private String filePath;
    private long fileSize;
    private Date uploadDate;
    private String status;
    private boolean analysisInProgress;
    private boolean analyzed;
    private int analysisProgress;
    private Map<String, Object> results;
    private Map<String, Boolean> selectedAnalyses;

    // Constructors
    public DocumentModel() {
    }

    public DocumentModel(String userId, String name, String originalFilename, String filePath,
            long fileSize, Map<String, Boolean> selectedAnalyses) {
        this.userId = userId;
        this.name = name;
        this.originalFilename = originalFilename;
        this.filePath = filePath;
        this.fileSize = fileSize;
        this.uploadDate = new Date();
        this.status = "Uploaded";
        this.analysisInProgress = false;
        this.analyzed = false;
        this.results = null;
        this.analysisProgress = 0;
        this.selectedAnalyses = selectedAnalyses;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public long getFileSize() {
        return fileSize;
    }

    public void setFileSize(long fileSize) {
        this.fileSize = fileSize;
    }

    public Date getUploadDate() {
        return uploadDate;
    }

    public void setUploadDate(Date uploadDate) {
        this.uploadDate = uploadDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isAnalyzed() {
        return analyzed;
    }

    public void setAnalyzed(boolean analyzed) {
        this.analyzed = analyzed;
    }

    public int getAnalysisProgress() {
        return analysisProgress;
    }

    public void setAnalysisProgress(int analysisProgress) {
        this.analysisProgress = analysisProgress;
    }

    public Map<String, Object> getResults() {
        return results;
    }

    public void setResults(Map<String, Object> results) {
        this.results = results;
    }

    public Map<String, Boolean> getSelectedAnalyses() {
        return selectedAnalyses;
    }

    public void setSelectedAnalyses(Map<String, Boolean> selectedAnalyses) {
        this.selectedAnalyses = selectedAnalyses;
    }

    public boolean isAnalysisInProgress() {
        return analysisInProgress;
    }

    public void setAnalysisInProgress(boolean analysisInProgress) {
        this.analysisInProgress = analysisInProgress;
    }
}