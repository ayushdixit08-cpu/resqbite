package com.resqbite.controller;

import com.resqbite.dto.UserDto;
import com.resqbite.entity.Ngo;
import com.resqbite.entity.User;
import com.resqbite.entity.Volunteer;
import com.resqbite.repository.NgoRepository;
import com.resqbite.repository.UserRepository;
import com.resqbite.repository.VolunteerRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class DiscoverController {

    private final UserRepository userRepository;
    private final NgoRepository ngoRepository;
    private final VolunteerRepository volunteerRepository;

    public DiscoverController(UserRepository userRepository, NgoRepository ngoRepository, VolunteerRepository volunteerRepository) {
        this.userRepository = userRepository;
        this.ngoRepository = ngoRepository;
        this.volunteerRepository = volunteerRepository;
    }

    @GetMapping("/api/organizations")
    public ResponseEntity<List<UserDto>> organizations() {
        List<User> ngos = userRepository.findAll().stream()
                .filter(u -> u.getRole() == User.UserType.NGO)
                .toList();
        return ResponseEntity.ok(ngos.stream().map(UserDto::from).toList());
    }

    @GetMapping("/api/volunteers")
    public ResponseEntity<List<UserDto>> volunteers() {
        List<User> volunteers = userRepository.findAll().stream()
                .filter(u -> u.getRole() == User.UserType.VOLUNTEER)
                .toList();
        return ResponseEntity.ok(volunteers.stream().map(UserDto::from).toList());
    }

    @GetMapping("/api/discover/ngos")
    public ResponseEntity<List<Ngo>> discoverNgos() {
        return ResponseEntity.ok(ngoRepository.findAll());
    }

    @GetMapping("/api/discover/volunteers")
    public ResponseEntity<List<Volunteer>> discoverVolunteers() {
        return ResponseEntity.ok(volunteerRepository.findAll());
    }

    @GetMapping("/api/ngos/{id}")
    public ResponseEntity<Ngo> ngoById(@PathVariable Long id) {
        return ResponseEntity.of(ngoRepository.findById(id));
    }

    @GetMapping("/api/volunteers/{id}")
    public ResponseEntity<Volunteer> volunteerById(@PathVariable Long id) {
        return ResponseEntity.of(volunteerRepository.findById(id));
    }
}
