package com.example.demo.repositories;

import com.example.demo.models.AnalysisJob;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnalysisJobRepository extends MongoRepository<AnalysisJob, String> {
    List<AnalysisJob> findByDocumentId(String documentId);
    List<AnalysisJob> findByUserId(String userId);
    List<AnalysisJob> findByStatus(AnalysisJob.Status status);
} 