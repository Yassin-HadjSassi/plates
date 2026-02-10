package com.example.accesscontrol.infrastructure;

import com.example.accesscontrol.domain.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CarRepository carRepository;
    private final TrackingLogRepository trackingRepository;

    public DataSeeder(UserRepository userRepository, CarRepository carRepository, TrackingLogRepository trackingRepository) {
        this.userRepository = userRepository;
        this.carRepository = carRepository;
        this.trackingRepository = trackingRepository;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Disabled for now as per user request
        if (true) return;

        if (userRepository.count() > 0) return;

        // --- Create Cars ---
        Car c1 = new Car("123-ABC", PlateType.COMPANY, "Toyota Camry", 2022, "Silver");
        Car c2 = new Car("999-XYZ", PlateType.EMPLOYEE, "Honda Civic", 2020, "Blue");
        Car c3 = new Car("BOSS-01", PlateType.COMPANY, "Tesla Model S", 2024, "Black");
        Car c4 = new Car("GUEST-99", PlateType.GUEST, "Range Rover", 2023, "White");
        Car c5 = new Car("LAB-101", PlateType.COMPANY, "Ford Transit", 2021, "Yellow");

        carRepository.saveAll(List.of(c1, c2, c3, c4, c5));

        // --- Create Users ---
        User director = new User("Robert Smith", "DIRECTOR");
        User employee1 = new User("Alice Johnson", "EMPLOYEE");
        User employee2 = new User("Mark Thompson", "EMPLOYEE");
        User guest = new User("Anonymous Guest", "GUEST");

        // Relationships
        director.addCar(c3);   // BOSS-01
        employee1.addCar(c2);  // 999-XYZ
        employee1.addCar(c1);  // Can also drive company car
        employee2.addCar(c5);  // LAB-101
        
        userRepository.saveAll(List.of(director, employee1, employee2, guest));

        // --- Seed Initial Logs ---
        // Let's assume some cars are already inside
        trackingRepository.save(new TrackingLog(employee1, c1, TrackingAction.AUTOMATIC_OPEN, Instant.now().minusSeconds(3600)));
        trackingRepository.save(new TrackingLog(director, c3, TrackingAction.AUTOMATIC_OPEN, Instant.now().minusSeconds(1800)));
        
        // And one exited
        trackingRepository.save(new TrackingLog(employee2, c5, TrackingAction.AUTOMATIC_OPEN, Instant.now().minusSeconds(5000)));
        trackingRepository.save(new TrackingLog(employee2, c5, TrackingAction.AUTOMATIC_CLOSE, Instant.now().minusSeconds(4000)));

        System.out.println(">>> PFE Data Seeded Successfully!");
    }
}
