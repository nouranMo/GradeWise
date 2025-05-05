package com.example.demo.repositories;

import com.example.demo.models.SubmissionModel;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubmissionRepository extends MongoRepository<SubmissionModel, String> {

    List<SubmissionModel> findByUserId(String userId);

    List<SubmissionModel> findBySubmissionSlotId(String submissionSlotId);

    List<SubmissionModel> findByStatus(String status);

    List<SubmissionModel> findByCourse(String course);

    List<SubmissionModel> findByCourseId(String courseId);
}