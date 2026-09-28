package com.example.EventEase.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.example.EventEase.Entity.Student;
import com.example.EventEase.exception.ResourceNotFoundException;
import com.example.EventEase.repository.StudentRepository;

@Service
public class StudentService {

    private final StudentRepository studentRepository;

    public StudentService(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    public Student createStudent(Student student) {
        return studentRepository.save(student);
    }

    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    public Student getStudentById(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + id));
    }

    public Student updateStudent(Long id, Student updatedStudent) {
        Student student = getStudentById(id);
        student.setName(updatedStudent.getName());
        student.setEmail(updatedStudent.getEmail());
        student.setDepartment(updatedStudent.getDepartment());
        student.setYear(updatedStudent.getYear());
        return studentRepository.save(student);
    }

    public void deleteStudent(Long id) {
        studentRepository.delete(getStudentById(id));
    }
}
