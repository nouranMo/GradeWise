package com.example.demo.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;
import java.util.Map;

@Document(collection = "submissions")
public class SubmissionModel {
    @Id
    private String id;
    private String documentId;
    private String submissionSlotId;
    private String userId;
    private String studentName;
    private String documentName;
    private String submissionType;
    private String course;
    private Date submissionDate;
    private Date lastModified;
    private String status;
    private Integer grade;
    private String feedback;
    private Map<String, Object> results;

    public SubmissionModel() {
        // Default constructor
    }

    public SubmissionModel(String documentId, String submissionSlotId, String userId,
            String documentName, String submissionType, String course) {
        this.id = String.valueOf(System.currentTimeMillis());
        this.documentId = documentId;
        this.submissionSlotId = submissionSlotId;
        this.userId = userId;
        this.documentName = documentName;
        this.submissionType = submissionType;
        this.course = course;
        this.submissionDate = new Date();
        this.lastModified = new Date();
        this.status = "Submitted";
    }

    // Getters and Setters
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

    public String getSubmissionSlotId() {
        return submissionSlotId;
    }

    public void setSubmissionSlotId(String submissionSlotId) {
        this.submissionSlotId = submissionSlotId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public String getDocumentName() {
        return documentName;
    }

    public void setDocumentName(String documentName) {
        this.documentName = documentName;
    }

    public String getSubmissionType() {
        return submissionType;
    }

    public void setSubmissionType(String submissionType) {
        this.submissionType = submissionType;
    }

    public String getCourse() {
        return course;
    }

    public void setCourse(String course) {
        this.course = course;
    }

    public Date getSubmissionDate() {
        return submissionDate;
    }

    public void setSubmissionDate(Date submissionDate) {
        this.submissionDate = submissionDate;
    }

    public Date getLastModified() {
        return lastModified;
    }

    public void setLastModified(Date lastModified) {
        this.lastModified = lastModified;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getGrade() {
        return grade;
    }

    public void setGrade(Integer grade) {
        this.grade = grade;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }

    public Map<String, Object> getResults() {
        return results;
    }

    public void setResults(Map<String, Object> results) {
        this.results = results;
    }
}