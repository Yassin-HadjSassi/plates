package com.example.accesscontrol.api;

import com.example.accesscontrol.api.dto.CamInputDTO;
import com.example.accesscontrol.api.dto.QrInputDTO;
import com.example.accesscontrol.application.PlateDetectionService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/input")
@CrossOrigin(origins = "*")
public class InputController {

    private final PlateDetectionService plateDetectionService;

    public InputController(PlateDetectionService plateDetectionService) {
        this.plateDetectionService = plateDetectionService;
    }

    @PostMapping("/camera")
    public void receiveCameraInput(@RequestBody CamInputDTO input) {
        plateDetectionService.handleCameraInput(input.getPlateNumber());
    }

    @PostMapping("/qr")
    public void receiveQrInput(@RequestBody QrInputDTO input) {
        plateDetectionService.handleQrInput(input.getUserId());
    }
}
