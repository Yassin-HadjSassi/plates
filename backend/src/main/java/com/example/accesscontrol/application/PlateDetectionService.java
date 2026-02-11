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

    // Stores pending plates: Key = PlateNumber, Value = PendingDetection
    private final Map<String, PendingDetection> pendingPlates = new ConcurrentHashMap<>();

    private static final long QR_TIMEOUT_SECONDS = 20;

    public PlateDetectionService(CarRepository carRepository, UserRepository userRepository, 
                                 BarrierService barrierService, TrackingService trackingService) {
        this.carRepository = carRepository;
        this.userRepository = userRepository;
        this.barrierService = barrierService;
        this.trackingService = trackingService;
    }

    public void handleCameraInput(String plateNumber, String direction) {
        // 1. Identify plate type
        Optional<Car> carOpt = carRepository.findById(plateNumber);
        
        Car car = carOpt.orElse(null); // Unknown car

        // 2. Start 20s timer (Store in memory)
        pendingPlates.put(plateNumber, new PendingDetection(Instant.now(), direction));
        
        // 3. Notify Guard (Guard polls 'getPendingPlates')
    }
    
    // Overload for backward compatibility if needed, defaulting to "ENTER"
    public void handleCameraInput(String plateNumber) {
        handleCameraInput(plateNumber, "ENTER");
    }


    public void handleQrInput(Long userId) {
        // Find if there's a pending plate (Simple assumption: LIFO or the one active at the gate)
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return;
        User user = userOpt.get();

        String targetPlate = findMatchingPendingPlate(user);

        if (targetPlate != null) {
            // Check timer
            PendingDetection detection = pendingPlates.get(targetPlate);
            if (detection.timestamp.isAfter(Instant.now().minusSeconds(QR_TIMEOUT_SECONDS))) {
                // QR within 20s AND Match found -> AUTOMATIC ACCESS
                processAccess(user, targetPlate, true, detection.direction);
            } else {
                // Timeout
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
        return null; 
    }

    private void processAccess(User user, String plateNumber, boolean auto, String direction) {
        if (auto) {
            barrierService.open();
            Car car = carRepository.findById(plateNumber).orElse(null);
            
            TrackingAction action = "EXIT".equalsIgnoreCase(direction) ? TrackingAction.AUTOMATIC_CLOSE : TrackingAction.AUTOMATIC_OPEN; 
            // NOTE: TrackingAction enum might not have EXIT specific actions yet, defaulting to logic or we should update enum.
            // For now, let's assume AUTOMATIC_OPEN is for Entry and maybe we need AUTOMATIC_EXIT?
            // User repo usually just logs "OPEN" or "CLOSE" meaning "Gate Open".
            // Let's stick to AUTOMATIC_OPEN for now as the gate opens in both cases.
            
            trackingService.logAction(user, car, TrackingAction.AUTOMATIC_OPEN);
            pendingPlates.remove(plateNumber); 
        }
    }

    // For Guard UI polling
    public Map<String, Instant> getPendingPlates() {
        // Map to just timestamps for backward compatibility if frontend expects Map<String, Instant>
        // OR better, change the frontend to expect object.
        // Let's keep the return type simple for now but maybe we should expose direction?
        // Changing return type to Map<String, PendingDetection> requires frontend update.
        // I will return a simplified map for now or we must update the Controller return type too.
        // Let's update Controller return type to return DTOs.
        return pendingPlates.entrySet().stream()
            .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, e -> e.getValue().timestamp));
    }
    
    public Map<String, PendingDetection> getPendingPlatesWithDetails() {
        return pendingPlates;
    }
    
    public void removePending(String plateNumber) {
        pendingPlates.remove(plateNumber);
    }
    
    public static class PendingDetection {
        public Instant timestamp;
        public String direction;
        
        public PendingDetection(Instant timestamp, String direction) {
            this.timestamp = timestamp;
            this.direction = direction;
        }
    }
}
