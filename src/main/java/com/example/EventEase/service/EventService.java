package com.example.EventEase.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import com.example.EventEase.Entity.Event;
import com.example.EventEase.Entity.Organizer;
import com.example.EventEase.exception.RegistrationException;
import com.example.EventEase.exception.ResourceNotFoundException;
import com.example.EventEase.repository.EventRepository;
import com.example.EventEase.repository.OrganizerRepository;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final OrganizerRepository organizerRepository;

    public EventService(EventRepository eventRepository,
                        OrganizerRepository organizerRepository) {
        this.eventRepository = eventRepository;
        this.organizerRepository = organizerRepository;
    }

    public Event createEvent(Event event, Long organizerId) {

        Organizer organizer = organizerRepository.findById(organizerId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Organizer not found with id: " + organizerId));

        if (event.getMaxSeats() == null || event.getMaxSeats() <= 0) {
            throw new RegistrationException(
                    "Maximum seats must be greater than zero.");
        }

        if (event.getEventDate() == null) {
            throw new RegistrationException(
                    "Event date is required.");
        }

        event.setOrganizer(organizer);
        event.setRegistrationOpen(true);

        return eventRepository.save(event);
    }

    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    public Event getEventById(Long id) {

        return eventRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Event not found with id: " + id));
    }

    public List<Event> getEventsByDate(LocalDate date) {
        return eventRepository.findByEventDate(date);
    }

    public List<Event> searchEvents(String title) {
        return eventRepository.findByTitleContainingIgnoreCase(title);
    }

    public List<Event> getOpenEvents() {
        return eventRepository.findByRegistrationOpenTrue();
    }

    public Event updateEvent(Long id, Event updatedEvent) {

        Event event = getEventById(id);

        event.setTitle(updatedEvent.getTitle());
        event.setEventDate(updatedEvent.getEventDate());
        event.setVenue(updatedEvent.getVenue());
        event.setMaxSeats(updatedEvent.getMaxSeats());

        return eventRepository.save(event);
    }

    public void deleteEvent(Long id) {

        Event event = getEventById(id);

        eventRepository.delete(event);
    }
}
