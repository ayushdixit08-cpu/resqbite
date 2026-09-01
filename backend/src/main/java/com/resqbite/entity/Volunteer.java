package com.resqbite.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "volunteers")
public class Volunteer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(length = 1500)
    private String availability;

    @Column(length = 1500)
    private String interests;

    @Column(length = 1500)
    private String skills;

    protected Volunteer() {}

    public Volunteer(User user, String availability, String interests, String skills) {
        this.user = user;
        this.availability = availability;
        this.interests = interests;
        this.skills = skills;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getAvailability() { return availability; }
    public void setAvailability(String availability) { this.availability = availability; }
    public String getInterests() { return interests; }
    public void setInterests(String interests) { this.interests = interests; }
    public String getSkills() { return skills; }
    public void setSkills(String skills) { this.skills = skills; }
}
