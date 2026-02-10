package com.example.accesscontrol.api.dto;

public class CamInputDTO {
    private String plateNumber;

    public CamInputDTO() {
    }

    public CamInputDTO(String plateNumber) {
        this.plateNumber = plateNumber;
    }

    public String getPlateNumber() {
        return plateNumber;
    }

    public void setPlateNumber(String plateNumber) {
        this.plateNumber = plateNumber;
    }
}
