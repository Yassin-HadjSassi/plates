package com.example.accesscontrol.application;

import com.example.accesscontrol.domain.*;
import com.example.accesscontrol.infrastructure.CarRepository;
import org.springframework.stereotype.Service;

@Service
public class GuardService {

    private final BarrierService barrierService;
    private final TrackingService trackingService;
    private final PlateDetectionService plateDetectionService;
    private final CarRepository carRepository;

    public GuardService(BarrierService barrierService, TrackingService trackingService, 
                        PlateDetectionService plateDetectionService, CarRepository carRepository) {
        this.barrierService = barrierService;
        this.trackingService = trackingService;
        this.plateDetectionService = plateDetectionService;
        this.carRepository = carRepository;
    }

    public void forceOpen(String plateNumber) {
        barrierService.open();
        Car car = null;
        if (plateNumber != null) {
             car = carRepository.findById(plateNumber).orElse(null);
             plateDetectionService.removePending(plateNumber);
        }
        trackingService.logAction(null, car, TrackingAction.FORCED_OPEN);
    }

    public void forceClose() {
        barrierService.close();
        trackingService.logAction(null, null, TrackingAction.FORCED_CLOSE);
    }

    public void reject(String plateNumber) {
        // Barrier stays closed (or closes if open? Prompt says "Guard decides... REJECT")
        // Usually means deny entry.
        Car car = null;
        if (plateNumber != null) {
            car = carRepository.findById(plateNumber).orElse(null);
            plateDetectionService.removePending(plateNumber);
        }
        trackingService.logAction(null, car, TrackingAction.REJECT);
    }
}
