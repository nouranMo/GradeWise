package com.example.demo.repositories;

import com.example.demo.models.Submission;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SubmissionRepository extends MongoRepository<Submission, String> {
    List<Submission> findByUserId(String userId);

    List<Submission> findByStatus(String status);

    List<Submission> findByCourseId(String courseId);
}