package com.example.EventEase.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.example.EventEase.Entity.Organizer;
import com.example.EventEase.exception.ResourceNotFoundException;
import com.example.EventEase.repository.OrganizerRepository;

@Service
public class OrganizerService {

    private final OrganizerRepository organizerRepository;

    public OrganizerService(OrganizerRepository organizerRepository) {
        this.organizerRepository = organizerRepository;
    }

    public Organizer createOrganizer(Organizer organizer) {
        return organizerRepository.save(organizer);
    }

    public List<Organizer> getAllOrganizers() {
        return organizerRepository.findAll();
    }

    public Organizer getOrganizerById(Long id) {
        return organizerRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Organizer not found with id: " + id));
    }

    public Organizer updateOrganizer(Long id, Organizer updatedOrganizer) {

        Organizer organizer = getOrganizerById(id);

        organizer.setName(updatedOrganizer.getName());
        organizer.setEmail(updatedOrganizer.getEmail());
        organizer.setDepartment(updatedOrganizer.getDepartment());

        return organizerRepository.save(organizer);
    }

    public void deleteOrganizer(Long id) {

        Organizer organizer = getOrganizerById(id);

        organizerRepository.delete(organizer);
    }
}