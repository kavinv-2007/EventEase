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

import com.example.EventEase.Entity.Student;
import com.example.EventEase.service.StudentService;

@RestController
@RequestMapping("/api/students")
public class StudentController {
    private final StudentService studentService;

    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Student create(@RequestBody Student student) { return studentService.createStudent(student); }

    @GetMapping
    public List<Student> getAll() { return studentService.getAllStudents(); }

    @GetMapping("/{id}")
    public Student getById(@PathVariable Long id) { return studentService.getStudentById(id); }

    @PutMapping("/{id}")
    public Student update(@PathVariable Long id, @RequestBody Student student) { return studentService.updateStudent(id, student); }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { studentService.deleteStudent(id); }
}
