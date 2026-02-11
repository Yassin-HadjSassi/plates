package com.example.accesscontrol.api.dto;

public class CamInputDTO {
    private String plateNumber;
    private String direction; // "ENTER" or "EXIT"

    public CamInputDTO() {
    }

    public CamInputDTO(String plateNumber, String direction) {
        this.plateNumber = plateNumber;
        this.direction = direction;
    }

    public String getPlateNumber() {
        return plateNumber;
    }

    public void setPlateNumber(String plateNumber) {
        this.plateNumber = plateNumber;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }
}
