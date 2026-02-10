package com.example.accesscontrol.api;

import com.example.accesscontrol.application.AdminService;
import com.example.accesscontrol.domain.Car;
import com.example.accesscontrol.domain.PlateType; // Added
import com.example.accesscontrol.domain.SystemConfig;
import com.example.accesscontrol.domain.User;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors; // Added

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    private final AdminService adminService;
    private final com.example.accesscontrol.application.TrackingService trackingService; // Added

    public AdminController(AdminService adminService, com.example.accesscontrol.application.TrackingService trackingService) {
        this.adminService = adminService;
        this.trackingService = trackingService;
    }

    // --- Users ---
    @GetMapping("/users")
    public List<User> getUsers() { 
        return adminService.getAllUsers(); 
    }

    @PostMapping("/users")
    public User createUser(@RequestBody User user) { 
        return adminService.createUser(user); 
    }

    @DeleteMapping("/users/{id}")
    public void deleteUser(@PathVariable Long id) { 
        adminService.deleteUser(id); 
    }

    // --- Cars ---
    @GetMapping("/cars")
    public List<Car> getCars() { 
        return adminService.getAllCars(); 
    }

    @PostMapping("/cars")
    public Car createCar(@RequestBody Car car) { 
        return adminService.createCar(car); 
    }

    @DeleteMapping("/cars/{plate}")
    public void deleteCar(@PathVariable String plate) { 
        adminService.deleteCar(plate); 
    }

    // --- Tracking & Status ---
    @GetMapping("/logs")
    public List<com.example.accesscontrol.domain.TrackingLog> getLogs() {
        return trackingService.getHistory();
    }

    @GetMapping("/car-status")
    public List<com.example.accesscontrol.application.TrackingService.CarStatusDTO> getCompanyCarStatus() {
        List<Car> companyCars = adminService.getAllCars().stream()
                .filter(c -> c.getPlateType() == PlateType.COMPANY)
                .collect(Collectors.toList());
        return trackingService.getCompanyCarsStatus(companyCars);
    }

    // --- Config ---
    @GetMapping("/config")
    public SystemConfig getConfig() { 
        return adminService.getConfig(); 
    }

    @PostMapping("/config")
    public SystemConfig updateConfig(@RequestBody SystemConfig config) { 
        return adminService.updateConfig(config); 
    }
}
