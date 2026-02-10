package com.example.accesscontrol.application;

import com.example.accesscontrol.domain.*;
import com.example.accesscontrol.infrastructure.CarRepository;
import com.example.accesscontrol.infrastructure.UserRepository;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PlateDetectionService {

    private final CarRepository carRepository;
    private final UserRepository userRepository;
    private final BarrierService barrierService;
    private final TrackingService trackingService;

    // Stores pending plates: Key = PlateNumber, Value = Timestamp of detection
    private final Map<String, Instant> pendingPlates = new ConcurrentHashMap<>();

    private static final long QR_TIMEOUT_SECONDS = 20;

    public PlateDetectionService(CarRepository carRepository, UserRepository userRepository, 
                                 BarrierService barrierService, TrackingService trackingService) {
        this.carRepository = carRepository;
        this.userRepository = userRepository;
        this.barrierService = barrierService;
        this.trackingService = trackingService;
    }

    public void handleCameraInput(String plateNumber) {
        // 1. Identify plate type
        Optional<Car> carOpt = carRepository.findById(plateNumber);
        
        Car car = carOpt.orElseGet(() -> {
            // Treat unknown cars as GUEST or just log them? 
            // Prompt says: "Camera detects... Starts 20s timer... Guard decides"
            // We'll create a transient Car object or just pass string?
            // "Camera sends only plate_number" -> "All other fields managed by Admin" 
            // If unknown, we can't really do much auto logic, but we must notify guard.
            return null; 
        });

        // 2. Start 20s timer (Store in memory)
        pendingPlates.put(plateNumber, Instant.now());
        
        // 3. Notify Guard (Guard polls 'getPendingPlates' or we assume notification is sent via that state)
        // Log isn't strictly required for 'Detection' in tracking_logs according to prompt (only Actions),
        // but typically we might want to log 'Arrived'? Prompt: "Every barrier-related action MUST be logged"
        // Actions: AUTOMATIC_OPEN... (Detection isn't an action in the enum).
    }

    public void handleQrInput(Long userId) {
        // Find if there's a pending plate (Simple assumption: LIFO or the one active at the gate)
        // For this PFE, we'll assume the most recently detected plate within timeout is the one.
        // Or we check if ANY pending plate matches the user.
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return;
        User user = userOpt.get();

        String targetPlate = findMatchingPendingPlate(user);

        if (targetPlate != null) {
            // Check timer
            Instant detectionTime = pendingPlates.get(targetPlate);
            if (detectionTime.isAfter(Instant.now().minusSeconds(QR_TIMEOUT_SECONDS))) {
                // QR within 20s AND Match found -> AUTOMATIC OPEN
                processAccess(user, targetPlate, true);
            } else {
                // Timeout passed, but User valid. "Guard decides".
                // We do nothing auto. Guard sees it.
            }
        }
    }

    private String findMatchingPendingPlate(User user) {
        // Check if user owns any of the pending plates
        for (Car userCar : user.getCars()) {
            if (pendingPlates.containsKey(userCar.getPlateNumber())) {
                return userCar.getPlateNumber();
            }
        }
        return null; // No match found or no pending plate for this user
    }

    private void processAccess(User user, String plateNumber, boolean auto) {
        if (auto) {
            barrierService.open();
            Car car = carRepository.findById(plateNumber).orElse(null);
            trackingService.logAction(user, car, TrackingAction.AUTOMATIC_OPEN);
            pendingPlates.remove(plateNumber); // Request handled
        }
    }

    // For Guard UI polling
    public Map<String, Instant> getPendingPlates() {
        return pendingPlates;
    }
    
    // Cleanup method for Guard actions
    public void removePending(String plateNumber) {
        pendingPlates.remove(plateNumber);
    }
}
