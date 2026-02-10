package com.example.accesscontrol.api.dto;

public class QrInputDTO {
    private Long userId;

    public QrInputDTO() {
    }

    public QrInputDTO(Long userId) {
        this.userId = userId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }
}
