package com.realestate.controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.realestate.dto.BookingDto;
import com.realestate.dto.PropertyDto;
import com.realestate.dto.UserDto;
import com.realestate.entity.MonthlyPayment;
import com.realestate.entity.Property;
import com.realestate.entity.RentBooking;
import com.realestate.entity.User;
import com.realestate.repository.MonthlyPaymentRepository;
import com.realestate.repository.PropertyRepository;
import com.realestate.repository.RentBookingRepository;
import com.realestate.repository.UserRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class BookingController {

    @Autowired private RentBookingRepository rentBookingRepo;
    @Autowired private MonthlyPaymentRepository monthlyPaymentRepo;
    @Autowired private PropertyRepository propertyRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private WalletController walletController;

    // DTOs
    public static class CreateRentBookingRequest {
        public Long propertyId;
        public LocalDate startDate;
        public LocalDate endDate; // optional
        public BigDecimal monthlyRent;
        public BigDecimal securityDeposit;
    }

    // Create rent booking
    @PostMapping("/rent")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    @Transactional
    public ResponseEntity<?> createRentBooking(@Valid @RequestBody CreateRentBookingRequest req) {
        Optional<User> tenantOpt = getCurrentUser();
        if (tenantOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User tenant = tenantOpt.get();

        Optional<Property> propertyOpt = propertyRepo.findById(req.propertyId);
        if (propertyOpt.isEmpty()) return ResponseEntity.notFound().build();
        Property property = propertyOpt.get();

        if (property.getStatus() != Property.PropertyStatus.FOR_RENT) {
            return ResponseEntity.badRequest().body("Property is not available for rent");
        }

        // Check availability
        LocalDate endDate = req.endDate != null ? req.endDate : LocalDate.now().plusYears(10); // Far future if indefinite
        List<RentBooking> conflicts = rentBookingRepo.findConflictingBookings(req.propertyId, req.startDate, endDate);
        if (!conflicts.isEmpty()) {
            return ResponseEntity.badRequest().body("Property is not available for the requested dates");
        }

        if (req.securityDeposit == null || req.securityDeposit.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body("Security deposit must be provided and greater than zero");
        }

        // Deduct security deposit upfront from tenant's wallet
        boolean depositPaid = walletController.deductMoney(
                tenant.getId(),
                req.securityDeposit,
                "Security deposit for " + property.getTitle(),
                "deposit_" + property.getId() + "_" + System.currentTimeMillis()
        );
        if (!depositPaid) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Insufficient wallet balance for security deposit");
        }

        try {
            RentBooking booking = new RentBooking();
            booking.setProperty(property);
            booking.setTenant(tenant);
            booking.setOwner(property.getOwner());
            booking.setStartDate(req.startDate);
            booking.setEndDate(req.endDate);
            booking.setMonthlyRent(req.monthlyRent);
            booking.setSecurityDeposit(req.securityDeposit);
            booking.setStatus(RentBooking.BookingStatus.PENDING_APPROVAL);
            booking = rentBookingRepo.save(booking);

            // Property status will be updated to RENTED only after approval
            // Don't generate payment until booking is approved

            return ResponseEntity.status(HttpStatus.CREATED).body(booking);
        } catch (Exception ex) {
            // Rollback deposit deduction if booking fails
            walletController.addMoney(
                    tenant.getId(),
                    req.securityDeposit,
                    "Security deposit refund (booking failed)",
                    "deposit_refund_fail_" + System.currentTimeMillis()
            );
            throw ex;
        }
    }

    // Get my bookings (as tenant)
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> getMyBookings() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userOpt.get();

        List<RentBooking> rentBookings = rentBookingRepo.findByTenant_Id(user.getId());

        return ResponseEntity.ok(Map.of("rentBookings", rentBookings));
    }

    // Get bookings for my properties (as owner)
    @GetMapping("/owner")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> getOwnerBookings() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userOpt.get();

        List<RentBooking> rentBookings = user.getRole() == User.Role.ADMIN ? 
            rentBookingRepo.findAll() : rentBookingRepo.findByOwner_Id(user.getId());

        List<BookingDto> bookingDtos = new ArrayList<>();
        for (RentBooking booking : rentBookings) {
            BookingDto dto = new BookingDto();
            dto.id = booking.getId();
            dto.status = booking.getStatus() != null ? booking.getStatus().name() : null;
            dto.monthlyRent = booking.getMonthlyRent();
            dto.securityDeposit = booking.getSecurityDeposit();
            dto.startDate = booking.getStartDate();
            dto.endDate = booking.getEndDate();
            dto.approvalDate = booking.getApprovalDate();
            dto.rejectionReason = booking.getRejectionReason();
            dto.createdAt = booking.getCreatedAt();
            dto.updatedAt = booking.getUpdatedAt();

            // Include property details
            if (booking.getProperty() != null) {
                Property p = booking.getProperty();
                PropertyDto pd = new PropertyDto();
                pd.id = p.getId();
                pd.title = p.getTitle();
                pd.address = p.getAddress();
                pd.city = p.getCity();
                pd.state = p.getState();
                pd.imageUrl = p.getImageUrl();
                dto.property = pd;
            }

            // Include tenant details
            if (booking.getTenant() != null) {
                User t = booking.getTenant();
                UserDto td = new UserDto();
                td.id = t.getId();
                td.firstName = t.getFirstName();
                td.lastName = t.getLastName();
                td.email = t.getEmail();
                td.phoneNumber = t.getPhoneNumber();
                dto.tenant = td;
            }

            bookingDtos.add(dto);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("rentBookings", bookingDtos);
        return ResponseEntity.ok(response);
    }

    // Get monthly payments for tenant
    @GetMapping("/payments/my")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> getMyPayments() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userOpt.get();

        List<MonthlyPayment> payments = monthlyPaymentRepo.findByTenantAndStatus(user.getId(), MonthlyPayment.PaymentStatus.PENDING);
        System.out.println("Fetching payments for user " + user.getEmail() + ": found " + payments.size());
        return ResponseEntity.ok(payments);
    }

    // Pay monthly rent via wallet
    @PostMapping("/payments/{paymentId}/pay")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> payMonthlyRent(@PathVariable Long paymentId) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userOpt.get();

        Optional<MonthlyPayment> paymentOpt = monthlyPaymentRepo.findById(paymentId);
        if (paymentOpt.isEmpty()) return ResponseEntity.notFound().build();
        MonthlyPayment payment = paymentOpt.get();

        // Verify ownership
        boolean isOwner = (payment.getRentBooking() != null && payment.getRentBooking().getTenant().getId().equals(user.getId()));
        if (!isOwner && user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (payment.getStatus() != MonthlyPayment.PaymentStatus.PENDING) {
            return ResponseEntity.badRequest().body("Payment is not pending");
        }

        // Deduct from wallet
        boolean success = walletController.deductMoney(user.getId(), payment.getAmount(), 
            "Monthly rent payment", "payment_" + payment.getId());
        if (!success) {
            return ResponseEntity.badRequest().body("Insufficient wallet balance");
        }

        // Update payment status
        payment.setStatus(MonthlyPayment.PaymentStatus.PAID);
        payment.setPaidDate(LocalDate.now());
        payment.setPaymentReference("wallet_" + user.getId());
        monthlyPaymentRepo.save(payment);

        // Generate next month's payment
        if (payment.getRentBooking() != null) {
            generateMonthlyPayment(payment.getRentBooking());
        }

        return ResponseEntity.ok(payment);
    }

    // Helper methods
    private void generateMonthlyPayment(RentBooking rentBooking) {
        MonthlyPayment payment = new MonthlyPayment();
        
        if (rentBooking != null) {
            payment.setRentBooking(rentBooking);
            payment.setAmount(rentBooking.getMonthlyRent());
            // Find next due date
            LocalDate nextDue = findNextDueDate(rentBooking.getId());
            payment.setDueDate(nextDue);
        }
        
        payment.setStatus(MonthlyPayment.PaymentStatus.PENDING);
        monthlyPaymentRepo.save(payment);
    }

    private LocalDate findNextDueDate(Long bookingId) {
        List<MonthlyPayment> existing = monthlyPaymentRepo.findByRentBooking_Id(bookingId);
        
        if (existing.isEmpty()) {
            return LocalDate.now().withDayOfMonth(1); // First of current month
        }
        
        // Find latest due date and add one month
        LocalDate latestDue = existing.stream()
            .map(MonthlyPayment::getDueDate)
            .max(LocalDate::compareTo)
            .orElse(LocalDate.now().withDayOfMonth(1));
        
        return latestDue.plusMonths(1);
    }

    private Optional<User> getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) return Optional.empty();
            Object principal = auth.getPrincipal();
            if (principal instanceof org.springframework.security.core.userdetails.User userDetails) {
                String email = userDetails.getUsername();
                return userRepo.findByEmailAndEnabledTrue(email);
            }
            if (principal instanceof User u) return Optional.of(u);
            return Optional.empty();
        } catch (Exception e) { return Optional.empty(); }
    }
}
