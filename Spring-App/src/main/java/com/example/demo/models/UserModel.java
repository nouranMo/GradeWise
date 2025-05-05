package com.example.demo.models;

import java.util.ArrayList;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "users")
public class UserModel {
    @Id
    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private String password;
    private List<String> roles = new ArrayList<>();
    private boolean enabled = true;

    public UserModel() {
    }

    public UserModel(String email, String firstName, String lastName) {
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
    }

    // Getters and setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        if (roles != null) {
            for (String role : roles) {
                if (!isValidRole(role)) {
                    throw new IllegalArgumentException("Invalid role: " + role);
                }
            }
        }
        this.roles = roles;
    }

    private boolean isValidRole(String role) {
        // Remove ROLE_ prefix if present for comparison
        String normalizedRole = role.startsWith("ROLE_") ? role.substring(5) : role;
        return normalizedRole.equals("STUDENT") ||
                normalizedRole.equals("PROFESSOR") ||
                normalizedRole.equals("ADMIN");
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}