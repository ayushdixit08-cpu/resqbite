package com.resqbite.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "follows")
public class Follow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "follower_id", nullable = false)
    private User follower;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "followed_id", nullable = false)
    private User followed;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected Follow() {}

    public Follow(User follower, User followed) {
        this.follower = follower;
        this.followed = followed;
    }

    public Long getId() { return id; }
    public User getFollower() { return follower; }
    public void setFollower(User follower) { this.follower = follower; }
    public User getFollowed() { return followed; }
    public void setFollowed(User followed) { this.followed = followed; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
