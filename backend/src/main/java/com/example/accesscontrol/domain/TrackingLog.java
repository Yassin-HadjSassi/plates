package com.example.accesscontrol.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "tracking_logs")
public class TrackingLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = true)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("cars")
    private User user;

    @ManyToOne
    @JoinColumn(name = "plate_number", nullable = true)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("users")
    private Car car;

    @Enumerated(EnumType.STRING)
    private TrackingAction action;

    @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
    private Instant timestamp;

    public TrackingLog() {
    }

    public TrackingLog(User user, Car car, TrackingAction action, Instant timestamp) {
        this.user = user;
        this.car = car;
        this.action = action;
        this.timestamp = timestamp;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Car getCar() { return car; }
    public void setCar(Car car) { this.car = car; }

    public TrackingAction getAction() { return action; }
    public void setAction(TrackingAction action) { this.action = action; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
