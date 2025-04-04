package com.example.demo.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;

@Document(collection = "submission_slots")
public class SubmissionSlotModel {
    @Id
    private String id;
    private String name;
    private String course;
    private String description;
    private Date deadline;
    private String professorId;
    private String status;
    private Integer submissionsCount;
    private Date createdAt;

    public SubmissionSlotModel() {
        // Default constructor
    }

    public SubmissionSlotModel(String name, String course, String description, Date deadline, String professorId) {
        this.id = String.valueOf(System.currentTimeMillis());
        this.name = name;
        this.course = course;
        this.description = description;
        this.deadline = deadline;
        this.professorId = professorId;
        this.status = "Open";
        this.submissionsCount = 0;
        this.createdAt = new Date();
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCourse() {
        return course;
    }

    public void setCourse(String course) {
        this.course = course;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Date getDeadline() {
        return deadline;
    }

    public void setDeadline(Date deadline) {
        this.deadline = deadline;
    }

    public String getProfessorId() {
        return professorId;
    }

    public void setProfessorId(String professorId) {
        this.professorId = professorId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getSubmissionsCount() {
        return submissionsCount;
    }

    public void setSubmissionsCount(Integer submissionsCount) {
        this.submissionsCount = submissionsCount;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public void incrementSubmissionsCount() {
        this.submissionsCount++;
    }
}