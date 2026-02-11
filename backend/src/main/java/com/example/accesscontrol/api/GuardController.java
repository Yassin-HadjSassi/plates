package com.example.accesscontrol.api;

import com.example.accesscontrol.application.BarrierService; // Added
import com.example.accesscontrol.application.GuardService;
import com.example.accesscontrol.application.PlateDetectionService;
import com.example.accesscontrol.application.TrackingService;
import com.example.accesscontrol.domain.Car; // Added
import com.example.accesscontrol.domain.TrackingLog;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/guard")
@CrossOrigin(origins = "*")
public class GuardController {

    private final GuardService guardService;
    private final PlateDetectionService plateDetectionService;
    private final TrackingService trackingService;
    private final BarrierService barrierService; // Added

    public GuardController(GuardService guardService, PlateDetectionService plateDetectionService, 
                           TrackingService trackingService, BarrierService barrierService) {
        this.guardService = guardService;
        this.plateDetectionService = plateDetectionService;
        this.trackingService = trackingService;
        this.barrierService = barrierService;
    }

    @GetMapping("/pending")
    public Map<String, PlateDetectionService.PendingDetection> getPendingPlates() {
        return plateDetectionService.getPendingPlatesWithDetails();
    }

    @PostMapping("/open")
    public void forceOpen(@RequestParam(required = false) String plate) {
        guardService.forceOpen(plate);
    }

    @PostMapping("/close")
    public void forceClose() {
        guardService.forceClose();
    }

    @PostMapping("/reject")
    public void reject(@RequestParam(required = false) String plate) {
        guardService.reject(plate);
    }
    
    @GetMapping("/logs")
    public List<TrackingLog> getLogs() {
        return trackingService.getHistory();
    }

    @GetMapping("/car-status")
    public List<com.example.accesscontrol.application.TrackingService.CarStatusDTO> getCompanyCarStatus() {
        List<Car> companyCars = trackingService.getHistory().stream()
                .map(log -> log.getCar())
                .filter(c -> c != null && c.getPlateType() == com.example.accesscontrol.domain.PlateType.COMPANY)
                .distinct()
                .collect(java.util.stream.Collectors.toList());
        
        // Better: Use AdminService toggle or just fetch all cars from repo if possible.
        // But GuardController doesn't have AdminService. Assuming TrackingService defines "Company Cars" based on logs or static list.
        // Actually, for PFE, let's just use the logs to find company cars or assume a known list.
        return trackingService.getCompanyCarsStatus(companyCars);
    }
    
    @GetMapping("/barrier") // Replaces deleted BarrierController
    public boolean getBarrierStatus() {
        return barrierService.getStatus();
    }
}
