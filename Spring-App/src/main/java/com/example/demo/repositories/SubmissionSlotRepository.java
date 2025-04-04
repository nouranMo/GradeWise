package com.example.demo.repositories;

import com.example.demo.models.SubmissionSlotModel;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubmissionSlotRepository extends MongoRepository<SubmissionSlotModel, String> {

    List<SubmissionSlotModel> findByProfessorId(String professorId);

    List<SubmissionSlotModel> findByStatus(String status);

    List<SubmissionSlotModel> findByCourse(String course);
}