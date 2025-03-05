package com.example.demo.repositories;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import com.example.demo.models.User;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findById(String id);
    Optional<User> findByProviderId(String providerId);
    Optional<User> findByEmailAndProvider(String email, String provider);
    boolean existsByEmail(String email);
}