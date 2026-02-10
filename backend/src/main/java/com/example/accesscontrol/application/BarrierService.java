package com.example.accesscontrol.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class BarrierService {

    private static final Logger logger = LoggerFactory.getLogger(BarrierService.class);
    private boolean isOpen = false;

    public void open() {
        logger.info("BARRIER: Opening...");
        this.isOpen = true;
    }

    public void close() {
        logger.info("BARRIER: Closing...");
        this.isOpen = false;
    }

    public boolean getStatus() {
        return isOpen;
    }
}
