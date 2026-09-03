package com.resqbite.service;

import com.resqbite.dto.AuthResponse;
import com.resqbite.dto.LoginRequest;
import com.resqbite.dto.RegisterRequest;
import com.resqbite.dto.UserDto;
import com.resqbite.entity.Ngo;
import com.resqbite.entity.User;
import com.resqbite.entity.Volunteer;
import com.resqbite.repository.NgoRepository;
import com.resqbite.repository.UserRepository;
import com.resqbite.repository.VolunteerRepository;
import com.resqbite.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final VolunteerRepository volunteerRepository;
    private final NgoRepository ngoRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       VolunteerRepository volunteerRepository,
                       NgoRepository ngoRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.volunteerRepository = volunteerRepository;
        this.ngoRepository = ngoRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (request.email() == null || request.password() == null || request.role() == null
                || request.name() == null || request.email().isBlank() || request.password().isBlank()) {
            throw new IllegalArgumentException("Name, email, password, and role are required");
        }
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email already in use");
        }

        final User.UserType role;
        try {
            String rawRole = request.role().trim().toUpperCase(Locale.ROOT);
            String normalizedRole = switch (rawRole) {
                case "NGO", "ORG" -> "ORGANIZATION";
                default -> rawRole;
            };
            role = User.UserType.valueOf(normalizedRole);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Role must be volunteer, organization, or donor");
        }
        User user = new User(
                request.name(),
                email,
                passwordEncoder.encode(request.password()),
                role,
                request.location(),
                request.bio(),
                request.skills(),
                request.interests()
        );
        user = userRepository.save(user);

        if (role == User.UserType.VOLUNTEER) {
            volunteerRepository.save(new Volunteer(user, "Flexible", request.interests(), request.skills()));
        } else if (role == User.UserType.ORGANIZATION) {
            ngoRepository.save(new Ngo(user, request.bio(), request.location(), "Open for collaboration", ""));
        }

        String token = jwtService.generateToken(user.getEmail(), Map.of(
                "userId", user.getId(),
                "role", user.getRole().name()
        ));

        return new AuthResponse(token, UserDto.from(user));
    }

    public AuthResponse login(LoginRequest request) {
        if (request.email() == null || request.password() == null
                || request.email().isBlank() || request.password().isBlank()) {
            throw new IllegalArgumentException("Email and password are required");
        }
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email().trim().toLowerCase(Locale.ROOT), request.password())
        );

        User user = userRepository.findByEmail(request.email().trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String token = jwtService.generateToken(user.getEmail(), Map.of(
                "userId", user.getId(),
                "role", user.getRole().name()
        ));

        return new AuthResponse(token, UserDto.from(user));
    }
}
