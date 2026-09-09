package com.resqbite.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.util.Collection;
import java.util.List;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = true)
    private String password;

    @Column(name = "google_id", unique = true, length = 255)
    private String googleId;

    @Column(nullable = false, length = 32)
    private String provider = "LOCAL";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserType role;

    private String location;

    @Column(length = 2000)
    private String bio;

    private String skills;

    private String interests;

    @Column(nullable = false)
    private boolean enabled = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected User() {}

    public User(String name, String email, String password, UserType role, String location, String bio, String skills, String interests) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.role = role;
        this.location = location;
        this.bio = bio;
        this.skills = skills;
        this.interests = interests;
    }

    public User(String name, String email, String password, UserType role, String location, String bio,
                String skills, String interests, String provider, String googleId) {
        this(name, email, password, role, location, bio, skills, interests);
        this.provider = provider == null ? "LOCAL" : provider;
        this.googleId = googleId;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getGoogleId() { return googleId; }
    public void setGoogleId(String googleId) { this.googleId = googleId; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    @JsonIgnore
    @Override
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public UserType getRole() { return role; }
    public void setRole(UserType role) { this.role = role; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getSkills() { return skills; }
    public void setSkills(String skills) { this.skills = skills; }
    public String getInterests() { return interests; }
    public void setInterests(String interests) { this.interests = interests; }

    @JsonIgnore
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return enabled; }

    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public enum UserType {
        VOLUNTEER,
        ORGANIZATION,
        DONOR
    }
}
