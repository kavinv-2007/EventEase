package com.example.EventEase.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.EventEase.Entity.Organizer;
import com.example.EventEase.service.OrganizerService;

@RestController
@RequestMapping("/api/organizers")
public class OrganizerController {
    private final OrganizerService organizerService;

    public OrganizerController(OrganizerService organizerService) { this.organizerService = organizerService; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Organizer create(@RequestBody Organizer organizer) { return organizerService.createOrganizer(organizer); }

    @GetMapping
    public List<Organizer> getAll() { return organizerService.getAllOrganizers(); }

    @GetMapping("/{id}")
    public Organizer getById(@PathVariable Long id) { return organizerService.getOrganizerById(id); }

    @PutMapping("/{id}")
    public Organizer update(@PathVariable Long id, @RequestBody Organizer organizer) { return organizerService.updateOrganizer(id, organizer); }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { organizerService.deleteOrganizer(id); }
}
