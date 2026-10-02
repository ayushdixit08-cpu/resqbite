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
import java.time.Instant;
import java.security.SecureRandom;
import java.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import jakarta.transaction.Transactional;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final VolunteerRepository volunteerRepository;
    private final NgoRepository ngoRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final com.resqbite.repository.PasswordTokenRepository passwordTokens;
    @Value("${google.client-id:}") private String googleClientId;

    public AuthService(UserRepository userRepository,
                       VolunteerRepository volunteerRepository,
                       NgoRepository ngoRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService, com.resqbite.repository.PasswordTokenRepository passwordTokens) {
        this.userRepository = userRepository;
        this.volunteerRepository = volunteerRepository;
        this.ngoRepository = ngoRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.passwordTokens = passwordTokens;
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

        final User.UserType role = User.normalizeRole(request.role());
        if (role == null) {
            throw new IllegalArgumentException("Role must be volunteer, ngo, organization, donor, or admin");
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
        } else if (role == User.UserType.NGO || role == User.UserType.ORGANIZATION) {
            ngoRepository.save(new Ngo(user, request.bio(), request.location(), "Open for collaboration", ""));
        }

        String token = jwtService.generateToken(user.getEmail(), Map.of(
                "userId", user.getId(),
                "role", user.getRole().name()
        ));

        return new AuthResponse(token, UserDto.from(user), null);
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
        ), request.rememberMe());

        return new AuthResponse(token, UserDto.from(user), request.rememberMe() ? jwtService.generateRefreshToken(user.getEmail()) : null);
    }

    public AuthResponse refresh(String refreshToken) {
        if (refreshToken == null || !jwtService.isRefreshToken(refreshToken)) throw new IllegalArgumentException("Invalid refresh token");
        User user = userRepository.findByEmail(jwtService.extractUsername(refreshToken)).orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));
        return new AuthResponse(jwtService.generateToken(user.getEmail(), Map.of("userId", user.getId(), "role", user.getRole().name())), UserDto.from(user), jwtService.generateRefreshToken(user.getEmail()));
    }

    @Transactional
    public AuthResponse googleLogin(com.resqbite.dto.GoogleLoginRequest request) {
        try {
            if (googleClientId == null || googleClientId.isBlank()) throw new IllegalArgumentException("Google login is not configured");
            if (request.idToken() == null || request.idToken().isBlank()) throw new IllegalArgumentException("Invalid Google identity");
            GoogleIdToken token = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(java.util.List.of(googleClientId)).build().verify(request.idToken());
            if (token == null || token.getPayload().getEmail() == null
                    || !Boolean.TRUE.equals(token.getPayload().getEmailVerified())
                    || token.getPayload().getSubject() == null
                    || !("accounts.google.com".equals(token.getPayload().getIssuer())
                        || "https://accounts.google.com".equals(token.getPayload().getIssuer())))
                throw new IllegalArgumentException("Invalid Google identity");
            String email = token.getPayload().getEmail().toLowerCase(Locale.ROOT);
            String googleId = token.getPayload().getSubject();
            User user = userRepository.findByGoogleId(googleId).orElseGet(() -> {
                User existing = userRepository.findByEmail(email).orElse(null);
                if (existing != null) {
                    if (existing.getGoogleId() != null && !googleId.equals(existing.getGoogleId())) {
                        throw new IllegalArgumentException("Google account is linked to another identity");
                    }
                    existing.setGoogleId(googleId);
                    existing.setProvider("GOOGLE");
                    return userRepository.save(existing);
                }
                return userRepository.save(new User(
                        token.getPayload().get("name") == null ? email : token.getPayload().get("name").toString(), email,
                        passwordEncoder.encode(java.util.UUID.randomUUID().toString()), User.UserType.DONOR,
                        null, null, null, null, "GOOGLE", googleId));
            });
            return new AuthResponse(jwtService.generateToken(email,
                    Map.of("userId", user.getId(), "role", user.getRole().name()), request.rememberMe()),
                    UserDto.from(user), request.rememberMe() ? jwtService.generateRefreshToken(email) : null);
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) { throw new IllegalArgumentException("Google authentication failed"); }
    }

    @Transactional
    public void forgotPassword(String email) {
        if (email == null || email.isBlank()) return;
        userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT)).ifPresent(user -> {
            passwordTokens.deleteByUser(user);
            byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
            String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            passwordTokens.save(new com.resqbite.entity.PasswordToken(user, hash(raw), Instant.now().plusSeconds(900)));
            // Integrate an email provider here; never return the raw token from the API.
        });
    }
    @Transactional
    public void resetPassword(String rawToken, String password) {
        var token = passwordTokens.findByTokenHash(hash(rawToken)).filter(t -> !t.isUsed() && t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset token"));
        token.getUser().setPassword(passwordEncoder.encode(password)); token.setUsed(true); passwordTokens.save(token);
    }
    private String hash(String value) {
        try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
}
