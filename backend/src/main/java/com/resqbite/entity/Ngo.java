package com.resqbite.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "ngos")
public class Ngo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(length = 1000)
    private String mission;

    @Column(length = 1000)
    private String focusArea;

    @Column(length = 2000)
    private String requirements;

    @Column(length = 500)
    private String website;

    protected Ngo() {}

    public Ngo(User user, String mission, String focusArea, String requirements, String website) {
        this.user = user;
        this.mission = mission;
        this.focusArea = focusArea;
        this.requirements = requirements;
        this.website = website;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getMission() { return mission; }
    public void setMission(String mission) { this.mission = mission; }
    public String getFocusArea() { return focusArea; }
    public void setFocusArea(String focusArea) { this.focusArea = focusArea; }
    public String getRequirements() { return requirements; }
    public void setRequirements(String requirements) { this.requirements = requirements; }
    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }
}
