package com.example.demo.repositories;

import com.example.demo.models.DocumentModel;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface DocumentRepository extends MongoRepository<DocumentModel, String> {
    List<DocumentModel> findByUserId(String userId);

    List<DocumentModel> findByUserIdAndAnalyzed(String userId, boolean analyzed);

    void deleteByUserId(String userId);
}