package com.example.demo.services;

import com.example.demo.models.User;
import com.example.demo.models.UserModel;
import com.example.demo.models.CourseModel;
import com.example.demo.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class UserService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private CourseService courseService;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        UserModel userModel = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        // Convert UserModel to Spring Security UserDetails
        return org.springframework.security.core.userdetails.User
                .withUsername(userModel.getEmail())
                .password(userModel.getPassword()) // Assuming password is stored in UserModel
                .authorities(getAuthorities(userModel))
                .disabled(!userModel.isEnabled()) // Assuming UserModel has isEnabled method
                .build();
    }

    private List<SimpleGrantedAuthority> getAuthorities(UserModel userModel) {
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        if (userModel.getRoles() != null) {
            for (String role : userModel.getRoles()) {
                authorities.add(new SimpleGrantedAuthority(role));
            }
        }
        return authorities;
    }

    // Helper method to convert UserModel to User
    private User convertToUser(UserModel userModel) {
        User user = new User();
        user.setId(userModel.getId());
        user.setEmail(userModel.getEmail());
        user.setFirstName(userModel.getFirstName());
        user.setLastName(userModel.getLastName());
        user.setPassword(userModel.getPassword());
        user.setRole(userModel.getRoles().isEmpty() ? "USER" : userModel.getRoles().get(0).replace("ROLE_", ""));
        user.setEnabled(userModel.isEnabled());
        return user;
    }

    // Helper method to convert User to UserModel
    private UserModel convertToUserModel(User user) {
        UserModel userModel = new UserModel();
        userModel.setId(user.getId());
        userModel.setEmail(user.getEmail());
        userModel.setFirstName(user.getFirstName());
        userModel.setLastName(user.getLastName());
        userModel.setPassword(user.getPassword());
        userModel.setRoles(Collections.singletonList(user.getRole())); // Store role without ROLE_ prefix
        userModel.setEnabled(user.isEnabled());
        return userModel;
    }

    public User registerUser(String email, String password, String firstName, String lastName, String role) {
        // Check if user already exists
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already in use");
        }

        // Create a new User object
        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setRole(role);
        user.setEnabled(true);

        // Save user
        UserModel userModel = convertToUserModel(user);
        UserModel savedModel = userRepository.save(userModel);
        return convertToUser(savedModel);
    }

    public User createProfessor(String email, String password, String firstName, String lastName) {
        // Check if user already exists
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already in use");
        }

        // Create a new User object
        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setRole("PROFESSOR"); // Set as professor without ROLE_ prefix
        user.setEnabled(true);

        // Save user
        UserModel userModel = convertToUserModel(user);
        UserModel savedModel = userRepository.save(userModel);
        return convertToUser(savedModel);
    }

    public User authenticateUser(String email, String password) {
        UserModel userModel = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        User user = convertToUser(userModel);

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        return user;
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .map(this::convertToUser)
                .orElse(null);
    }

    public User save(User user) {
        UserModel savedModel = userRepository.save(convertToUserModel(user));
        return convertToUser(savedModel);
    }

    public List<User> findAllUsers() {
        List<User> users = new ArrayList<>();
        userRepository.findAll().forEach(userModel -> {
            User user = convertToUser(userModel);
            if (!user.getRole().equals("ADMIN")) { // Exclude admin users
                users.add(user);
            }
        });
        return users;
    }

    public User findById(String id) {
        return userRepository.findById(id)
                .map(this::convertToUser)
                .orElse(null);
    }

    /**
     * Delete a user by ID
     */
    public void deleteUser(String userId) {
        // Check if user exists
        User user = findById(userId);
        if (user == null) {
            throw new IllegalArgumentException("User not found with ID: " + userId);
        }

        // Remove user from any courses they're assigned to
        if (user.getRole() != null) {
            String role = user.getRole().toUpperCase();
            if (role.contains("STUDENT")) {
                List<CourseModel> courses = courseService.getCoursesForStudent(userId);
                for (CourseModel course : courses) {
                    courseService.removeStudentFromCourse(course.getId(), userId);
                }
            } else if (role.contains("TEACHER") || role.contains("PROFESSOR")) {
                List<CourseModel> courses = courseService.getCoursesForTeacher(userId);
                for (CourseModel course : courses) {
                    courseService.removeTeacherFromCourse(course.getId(), userId);
                }
            }
        }

        // Delete the user
        userRepository.deleteById(userId);
    }
}
