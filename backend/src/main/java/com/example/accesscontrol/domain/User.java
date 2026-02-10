package com.example.accesscontrol.domain;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "app_users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(name = "user_role")
    private String role; // director | employee | mechanic | ...

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_cars",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "plate_number")
    )
    private Set<Car> cars = new HashSet<>();

    public User() {
    }

    public User(String name, String role) {
        this.name = name;
        this.role = role;
    }
    
    public void addCar(Car car) {
        this.cars.add(car);
        car.getUsers().add(this);
    }

    public void removeCar(Car car) {
        this.cars.remove(car);
        car.getUsers().remove(this);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Set<Car> getCars() { return cars; }
    public void setCars(Set<Car> cars) { this.cars = cars; }

    @Override
    public String toString() {
        return "User{id=" + id + ", name='" + name + "', role='" + role + "'}";
    }
}
