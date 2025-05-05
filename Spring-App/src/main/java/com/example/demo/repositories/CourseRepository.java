package com.example.demo.repositories;

import com.example.demo.models.CourseModel;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CourseRepository extends MongoRepository<CourseModel, String> {
    List<CourseModel> findByTeacherIdsContaining(String teacherId);
    List<CourseModel> findByStudentIdsContaining(String studentId);
} 