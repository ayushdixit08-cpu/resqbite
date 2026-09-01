package com.resqbite.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "connections")
public class Connection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_one_id", nullable = false)
    private User userOne;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_two_id", nullable = false)
    private User userTwo;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id")
    private Request request;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected Connection() {}

    public Connection(User userOne, User userTwo, Request request) {
        this.userOne = userOne;
        this.userTwo = userTwo;
        this.request = request;
    }

    public Long getId() { return id; }
    public User getUserOne() { return userOne; }
    public void setUserOne(User userOne) { this.userOne = userOne; }
    public User getUserTwo() { return userTwo; }
    public void setUserTwo(User userTwo) { this.userTwo = userTwo; }
    public Request getRequest() { return request; }
    public void setRequest(Request request) { this.request = request; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
