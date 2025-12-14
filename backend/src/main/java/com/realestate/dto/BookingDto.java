package com.realestate.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class BookingDto {
    public Long id;
    public String status;
    public BigDecimal monthlyRent;
    public BigDecimal securityDeposit;
    public LocalDate startDate;
    public LocalDate endDate;
    public LocalDateTime approvalDate;
    public String rejectionReason;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;
    public PropertyDto property;
    public UserDto tenant;
}

