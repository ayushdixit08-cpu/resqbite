package com.resqbite.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "requests", indexes = {
        @Index(name = "idx_requests_sender_type_created", columnList = "sender_id, type, created_at"),
        @Index(name = "idx_requests_recipient_type_status", columnList = "recipient_id, type, status"),
        @Index(name = "idx_requests_volunteer_type_status", columnList = "volunteer_id, type, status"),
        @Index(name = "idx_requests_type_status_created", columnList = "type, status, created_at")
})
public class Request {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "volunteer_id")
    private User volunteer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status = RequestStatus.PENDING;

    @Column(length = 4000)
    private String message;

    private String activityTitle;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    private Instant updatedAt;

    protected Request() {}

    public Request(User sender, User recipient, RequestType type, String message, String activityTitle) {
        this.sender = sender;
        this.recipient = recipient;
        this.type = type;
        this.message = message;
        this.activityTitle = activityTitle;
    }

    public Long getId() { return id; }
    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
    public User getRecipient() { return recipient; }
    public void setRecipient(User recipient) { this.recipient = recipient; }
    public User getVolunteer() { return volunteer; }
    public void setVolunteer(User volunteer) { this.volunteer = volunteer; }
    public RequestType getType() { return type; }
    public void setType(RequestType type) { this.type = type; }
    public RequestStatus getStatus() { return status; }
    public void setStatus(RequestStatus status) { this.status = status; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getActivityTitle() { return activityTitle; }
    public void setActivityTitle(String activityTitle) { this.activityTitle = activityTitle; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public enum RequestType {
        VOLUNTEER_TO_NGO,
        NGO_TO_VOLUNTEER,
        FOOD_DONATION
    }

    public enum RequestStatus {
        AVAILABLE,
        PENDING,
        ACCEPTED,
        PICKUP_SCHEDULED,
        PICKED_UP,
        IN_TRANSIT,
        DELIVERED,
        REJECTED,
        CANCELLED,
        COMPLETED
    }
}
