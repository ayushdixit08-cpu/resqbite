package com.resqbite.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "opportunities")
public class Opportunity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ngo_id", nullable = false)
    private User ngo;

    @Column(nullable = false)
    private String title;

    @Column(length = 4000)
    private String description;

    private String location;

    @Column(nullable = false)
    private String requirements;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected Opportunity() {}

    public Opportunity(User ngo, String title, String description, String location, String requirements) {
        this.ngo = ngo;
        this.title = title;
        this.description = description;
        this.location = location;
        this.requirements = requirements;
    }

    public Long getId() { return id; }
    public User getNgo() { return ngo; }
    public void setNgo(User ngo) { this.ngo = ngo; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getRequirements() { return requirements; }
    public void setRequirements(String requirements) { this.requirements = requirements; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
