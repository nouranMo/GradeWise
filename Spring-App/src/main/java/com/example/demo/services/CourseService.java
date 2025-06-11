package com.example.demo.services;

import com.example.demo.models.CourseModel;
import com.example.demo.models.User;
import com.example.demo.models.UserModel;
import com.example.demo.repositories.CourseRepository;
import com.example.demo.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class CourseService {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    public List<CourseModel> getAllCourses() {
        return courseRepository.findAll();
    }

    public CourseModel getCourseById(String id) {
        return courseRepository.findById(id).orElse(null);
    }

    public CourseModel createCourse(CourseModel course) {
        return courseRepository.save(course);
    }

    public CourseModel updateCourse(CourseModel course) {
        return courseRepository.save(course);
    }

    public void deleteCourse(String id) {
        courseRepository.deleteById(id);
    }

    /**
     * Assign a teacher to a course
     */
    public CourseModel assignTeacherToCourse(String courseId, String teacherId) {
        // Get the course
        CourseModel course = getCourseById(courseId);
        if (course == null) {
            throw new IllegalArgumentException("Course not found with ID: " + courseId);
        }
        
        // Get the teacher
        User teacher = userService.findById(teacherId);
        if (teacher == null) {
            throw new IllegalArgumentException("User not found with ID: " + teacherId);
        }
        
        // Check if the user is a teacher/professor
        String role = teacher.getRole();
        if (!role.equals("ROLE_TEACHER") && !role.equals("PROFESSOR") && !role.equals("TEACHER")) {
            throw new IllegalArgumentException("Invalid teacher ID or user is not a teacher");
        }
        
        // Add the teacher to the course if not already added
        if (course.getTeacherIds() == null) {
            course.setTeacherIds(new ArrayList<>());
        }
        
        if (!course.getTeacherIds().contains(teacherId)) {
            course.getTeacherIds().add(teacherId);
            return courseRepository.save(course);
        }
        
        return course;
    }

    public CourseModel assignStudentToCourse(String courseId, String studentId) {
        // Verify student exists and has student role
        Optional<UserModel> studentOpt = userRepository.findById(studentId);
        if (studentOpt.isEmpty()) {
            throw new IllegalArgumentException("Invalid student ID or user not found");
        }
        
        UserModel student = studentOpt.get();
        boolean isStudent = student.getRoles().contains("ROLE_STUDENT") || 
                           student.getRoles().contains("STUDENT");
        
        if (!isStudent) {
            throw new IllegalArgumentException("Invalid student ID or user is not a student");
        }

        CourseModel course = getCourseById(courseId);
        if (course == null) {
            throw new IllegalArgumentException("Course not found");
        }

        if (!course.getStudentIds().contains(studentId)) {
            course.getStudentIds().add(studentId);
            return courseRepository.save(course);
        }
        
        return course;
    }

    public CourseModel removeStudentFromCourse(String courseId, String studentId) {
        CourseModel course = getCourseById(courseId);
        if (course == null) {
            throw new IllegalArgumentException("Course not found");
        }

        course.getStudentIds().remove(studentId);
        return courseRepository.save(course);
    }

    public CourseModel removeTeacherFromCourse(String courseId, String teacherId) {
        CourseModel course = getCourseById(courseId);
        if (course == null) {
            throw new IllegalArgumentException("Course not found");
        }

        course.getTeacherIds().remove(teacherId);
        return courseRepository.save(course);
    }

    public List<CourseModel> getCoursesForTeacher(String teacherId) {
        return courseRepository.findByTeacherIdsContaining(teacherId);
    }

    public List<CourseModel> getCoursesForStudent(String studentId) {
        return courseRepository.findByStudentIdsContaining(studentId);
    }
} 