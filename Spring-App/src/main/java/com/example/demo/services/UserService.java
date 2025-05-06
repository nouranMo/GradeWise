package com.example.demo.services;

import com.example.demo.models.User;
import com.example.demo.models.UserModel;
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
        userModel.setRoles(Collections.singletonList("ROLE_" + user.getRole()));
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
        userRepository.findAll().forEach(userModel -> users.add(convertToUser(userModel)));
        return users;
    }

    public User findById(String id) {
        return userRepository.findById(id)
                .map(this::convertToUser)
                .orElse(null);
    }

    /**
     * Get a user by email
     */
    public UserModel getUserByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

    /**
     * Create a new user
     */
    public UserModel createUser(UserModel user) {
        // Hash the password before saving
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    /**
     * Get a user by ID
     */
    public UserModel getUserById(String id) {
        return userRepository.findById(id).orElse(null);
    }

    /**
     * Update a user
     */
    public UserModel updateUser(UserModel user) {
        return userRepository.save(user);
    }

    /**
     * Delete a user
     */
    public void deleteUser(String id) {
        userRepository.deleteById(id);
    }
}
