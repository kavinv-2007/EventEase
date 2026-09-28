package com.example.EventEase.controller;

import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.EventEase.Entity.Event;
import com.example.EventEase.service.EventService;

@RestController
@RequestMapping("/api/events")
public class EventController {
    private final EventService eventService;

    public EventController(EventService eventService) { this.eventService = eventService; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Event create(@RequestParam Long organizerId, @RequestBody Event event) {
        return eventService.createEvent(event, organizerId);
    }

    @GetMapping
    public List<Event> getAll(@RequestParam(required = false) LocalDate date,
                              @RequestParam(required = false) String title,
                              @RequestParam(required = false) Boolean open) {
        if (date != null) return eventService.getEventsByDate(date);
        if (title != null && !title.isBlank()) return eventService.searchEvents(title);
        if (Boolean.TRUE.equals(open)) return eventService.getOpenEvents();
        return eventService.getAllEvents();
    }

    @GetMapping("/{id}")
    public Event getById(@PathVariable Long id) { return eventService.getEventById(id); }

    @PutMapping("/{id}")
    public Event update(@PathVariable Long id, @RequestBody Event event) { return eventService.updateEvent(id, event); }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { eventService.deleteEvent(id); }
}
