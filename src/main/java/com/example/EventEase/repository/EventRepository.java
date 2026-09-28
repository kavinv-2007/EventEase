package com.example.EventEase.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

import com.example.EventEase.Entity.Event;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByEventDate(LocalDate eventDate);

    List<Event> findByTitleContainingIgnoreCase(String title);

    List<Event> findByRegistrationOpenTrue();
}
