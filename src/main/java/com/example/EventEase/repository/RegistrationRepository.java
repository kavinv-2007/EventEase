package com.example.EventEase.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.EventEase.Entity.Registration;

public interface RegistrationRepository extends JpaRepository<Registration, Long> {

    long countByEventIdAndStatus(Long eventId, String status);

    boolean existsByEventIdAndStudentIdAndStatus(
            Long eventId,
            Long studentId,
            String status
    );

    Optional<Registration> findByEventIdAndStudentId(Long eventId, Long studentId);

    List<Registration> findByEventIdAndStatus(Long eventId, String status);

    List<Registration> findByStudentId(Long studentId);
}