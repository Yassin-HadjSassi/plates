package com.example.accesscontrol.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "system_config")
public class SystemConfig {

    @Id
    private String id = "CONFIG"; // Singleton

    private long qrTimeoutSeconds = 20;
    private long autoCloseDelaySeconds = 10;

    public SystemConfig() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public long getQrTimeoutSeconds() { return qrTimeoutSeconds; }
    public void setQrTimeoutSeconds(long qrTimeoutSeconds) { this.qrTimeoutSeconds = qrTimeoutSeconds; }

    public long getAutoCloseDelaySeconds() { return autoCloseDelaySeconds; }
    public void setAutoCloseDelaySeconds(long autoCloseDelaySeconds) { this.autoCloseDelaySeconds = autoCloseDelaySeconds; }
}
