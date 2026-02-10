package com.example.accesscontrol.domain;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "cars")
public class Car {

    @Id
    @Column(length = 20)
    private String plateNumber;

    @Enumerated(EnumType.STRING)
    private PlateType plateType; // COMPANY | EMPLOYEE | GUEST

    private String model;
    
    private int creationYear;
    
    private String color;

    @ManyToMany(mappedBy = "cars")
    @JsonIgnore
    private Set<User> users = new HashSet<>();

    public Car() {
    }

    public Car(String plateNumber, PlateType plateType, String model, int creationYear, String color) {
        this.plateNumber = plateNumber;
        this.plateType = plateType;
        this.model = model;
        this.creationYear = creationYear;
        this.color = color;
    }

    public String getPlateNumber() { return plateNumber; }
    public void setPlateNumber(String plateNumber) { this.plateNumber = plateNumber; }

    public PlateType getPlateType() { return plateType; }
    public void setPlateType(PlateType plateType) { this.plateType = plateType; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public int getCreationYear() { return creationYear; }
    public void setCreationYear(int creationYear) { this.creationYear = creationYear; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Set<User> getUsers() { return users; }
    public void setUsers(Set<User> users) { this.users = users; }

    @Override
    public String toString() {
        return "Car{plateNumber='" + plateNumber + "', plateType=" + plateType + ", model='" + model + "'}";
    }
}
