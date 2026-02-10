package com.example.accesscontrol.application;

import com.example.accesscontrol.domain.*;
import com.example.accesscontrol.infrastructure.TrackingLogRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TrackingService {

    private final TrackingLogRepository trackingRepository;

    public TrackingService(TrackingLogRepository trackingRepository) {
        this.trackingRepository = trackingRepository;
    }

    public void logAction(User user, Car car, TrackingAction action) {
        TrackingLog log = new TrackingLog(user, car, action, Instant.now());
        trackingRepository.save(log);
    }

    public List<TrackingLog> getHistory() {
        return trackingRepository.findAll();
    }

    public List<CarStatusDTO> getCompanyCarsStatus(List<Car> allCompanyCars) {
        List<TrackingLog> allLogs = trackingRepository.findAll();
        
        return allCompanyCars.stream().map(car -> {
            TrackingLog lastLog = allLogs.stream()
                .filter(l -> l.getCar() != null && l.getCar().getPlateNumber().equals(car.getPlateNumber()))
                .max(Comparator.comparing(TrackingLog::getTimestamp))
                .orElse(null);

            String status = (lastLog != null && isEntryAction(lastLog.getAction())) ? "INSIDE" : "OUTSIDE";
            return new CarStatusDTO(car, status);
        }).collect(Collectors.toList());
    }

    private boolean isEntryAction(TrackingAction action) {
        return action == TrackingAction.AUTOMATIC_OPEN || action == TrackingAction.FORCED_OPEN;
    }

    // Simple inner DTO for easier JSON mapping
    public static class CarStatusDTO {
        public Car car;
        public String status;
        public CarStatusDTO(Car car, String status) { this.car = car; this.status = status; }
    }
}
