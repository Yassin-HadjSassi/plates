package com.example.accesscontrol.application;

import com.example.accesscontrol.domain.Car;
import com.example.accesscontrol.domain.SystemConfig;
import com.example.accesscontrol.domain.User;
import com.example.accesscontrol.infrastructure.CarRepository;
import com.example.accesscontrol.infrastructure.SystemConfigRepository;
import com.example.accesscontrol.infrastructure.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final CarRepository carRepository;
    private final SystemConfigRepository configRepository;

    public AdminService(UserRepository userRepository, CarRepository carRepository, SystemConfigRepository configRepository) {
        this.userRepository = userRepository;
        this.carRepository = carRepository;
        this.configRepository = configRepository;
    }

    // Users
    public List<User> getAllUsers() { return userRepository.findAll(); }
    public User createUser(User user) { return userRepository.save(user); }
    public void deleteUser(Long id) { userRepository.deleteById(id); }

    // Cars
    public List<Car> getAllCars() { return carRepository.findAll(); }
    public Car createCar(Car car) { return carRepository.save(car); }
    public void deleteCar(String plateNumber) { carRepository.deleteById(plateNumber); }

    // Config
    public SystemConfig getConfig() {
        return configRepository.findById("CONFIG").orElse(new SystemConfig());
    }
    public SystemConfig updateConfig(SystemConfig config) {
        config.setId("CONFIG");
        return configRepository.save(config);
    }
}
