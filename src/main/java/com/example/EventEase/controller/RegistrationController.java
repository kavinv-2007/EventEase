package com.example.EventEase.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.EventEase.Entity.Registration;
import com.example.EventEase.service.RegistrationService;

@RestController
@RequestMapping("/api")
public class RegistrationController {
    private final RegistrationService registrationService;

    public RegistrationController(RegistrationService registrationService) { this.registrationService = registrationService; }

    @PostMapping("/events/{eventId}/registrations/{studentId}")
    @ResponseStatus(HttpStatus.CREATED)
    public Registration register(@PathVariable Long eventId, @PathVariable Long studentId) {
        return registrationService.registerStudent(eventId, studentId);
    }

    @PostMapping("/events/{eventId}/registrations/{studentId}/cancel")
    public Registration cancel(@PathVariable Long eventId, @PathVariable Long studentId) {
        return registrationService.cancelRegistration(eventId, studentId);
    }

    @GetMapping("/registrations")
    public List<Registration> getAll() { return registrationService.getAllRegistrations(); }

    @GetMapping("/students/{studentId}/registrations")
    public List<Registration> getStudentRegistrations(@PathVariable Long studentId) {
        return registrationService.getStudentRegistrations(studentId);
    }

    @GetMapping("/events/{eventId}/participants")
    public List<Registration> getParticipants(@PathVariable Long eventId) {
        return registrationService.getRegisteredParticipants(eventId);
    }
}
