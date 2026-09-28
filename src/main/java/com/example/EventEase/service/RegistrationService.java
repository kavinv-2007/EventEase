package com.example.EventEase.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import com.example.EventEase.Entity.Event;
import com.example.EventEase.Entity.Registration;
import com.example.EventEase.Entity.Student;
import com.example.EventEase.exception.RegistrationException;
import com.example.EventEase.exception.ResourceNotFoundException;
import com.example.EventEase.repository.EventRepository;
import com.example.EventEase.repository.RegistrationRepository;
import com.example.EventEase.repository.StudentRepository;

@Service
public class RegistrationService {

    private final RegistrationRepository registrationRepository;
    private final EventRepository eventRepository;
    private final StudentRepository studentRepository;

    public RegistrationService(
            RegistrationRepository registrationRepository,
            EventRepository eventRepository,
            StudentRepository studentRepository) {

        this.registrationRepository = registrationRepository;
        this.eventRepository = eventRepository;
        this.studentRepository = studentRepository;
    }

    // STUDENT REGISTRATION
    public Registration registerStudent(Long eventId, Long studentId) {

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Event not found with id: " + eventId));

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Student not found with id: " + studentId));

        // Rule 1: Event date must not have passed
        if (event.getEventDate().isBefore(LocalDate.now())) {
            throw new RegistrationException(
                    "Registration failed. Event date has already passed.");
        }

        // Rule 2: Registration must be open
        if (!Boolean.TRUE.equals(event.getRegistrationOpen())) {
            throw new RegistrationException(
                    "Registration is closed for this event.");
        }

        // Rule 3: Student cannot register twice
        boolean alreadyRegistered =
                registrationRepository
                        .existsByEventIdAndStudentIdAndStatus(
                                eventId,
                                studentId,
                                "REGISTERED");

        if (alreadyRegistered) {
            throw new RegistrationException(
                    "Student is already registered for this event.");
        }

        // Rule 4: Check available seats
        long registeredCount =
                registrationRepository
                        .countByEventIdAndStatus(
                                eventId,
                                "REGISTERED");

        if (registeredCount >= event.getMaxSeats()) {

            event.setRegistrationOpen(false);
            eventRepository.save(event);

            throw new RegistrationException(
                    "Registration failed. Event is already full.");
        }

        // Reuse a cancelled record because the database allows one row per
        // event and student pair.
        Registration registration = registrationRepository
                .findByEventIdAndStudentId(eventId, studentId)
                .orElseGet(() -> new Registration(event, student));
        registration.setEvent(event);
        registration.setStudent(student);
        registration.setRegistrationDate(java.time.LocalDateTime.now());
        registration.setStatus("REGISTERED");

        Registration savedRegistration =
                registrationRepository.save(registration);

        // Rule 5: Automatically close when capacity reached
        long updatedCount =
                registrationRepository
                        .countByEventIdAndStatus(
                                eventId,
                                "REGISTERED");

        if (updatedCount >= event.getMaxSeats()) {

            event.setRegistrationOpen(false);
            eventRepository.save(event);
        }

        return savedRegistration;
    }

    // CANCEL REGISTRATION
    public Registration cancelRegistration(
            Long eventId,
            Long studentId) {

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Event not found with id: " + eventId));

        Registration registration =
                registrationRepository
                        .findByEventIdAndStudentId(
                                eventId,
                                studentId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Registration not found."));

        // Rule 6: Only registered record can be cancelled
        if (!"REGISTERED".equals(registration.getStatus())) {
            throw new RegistrationException(
                    "Registration is already cancelled.");
        }

        // Rule 7: Cancellation only before event date
        if (!LocalDate.now().isBefore(event.getEventDate())) {
            throw new RegistrationException(
                    "Registration cannot be cancelled after the event date.");
        }

        registration.setStatus("CANCELLED");

        Registration cancelled =
                registrationRepository.save(registration);

        // Rule 8: Cancellation frees a seat
        event.setRegistrationOpen(true);
        eventRepository.save(event);

        return cancelled;
    }

    // ORGANIZER VIEWS PARTICIPANTS
    public List<Registration> getRegisteredParticipants(Long eventId) {

        // Ensure event exists
        eventRepository.findById(eventId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Event not found with id: " + eventId));

        return registrationRepository
                .findByEventIdAndStatus(
                        eventId,
                        "REGISTERED");
    }

    // GET ALL REGISTRATIONS
    public List<Registration> getAllRegistrations() {
        return registrationRepository.findAll();
    }

    // GET STUDENT REGISTRATIONS
    public List<Registration> getStudentRegistrations(Long studentId) {

        studentRepository.findById(studentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Student not found with id: " + studentId));

        return registrationRepository.findByStudentId(studentId);
    }
}
