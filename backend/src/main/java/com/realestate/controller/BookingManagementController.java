package com.realestate.controller;

import com.realestate.entity.*;
import com.realestate.repository.*;
import com.realestate.service.BookingNotificationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/booking-management")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class BookingManagementController {

    @Autowired private RentBookingRepository rentBookingRepo;
    @Autowired private MonthlyPaymentRepository monthlyPaymentRepo;
    @Autowired private PropertyRepository propertyRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private BookingNotificationService notificationService;
    @Autowired private WalletController walletController;

    // DTOs
    public static class ApproveBookingRequest {
        public String approvalMessage;
        public BigDecimal finalMonthlyRent; // Allow owner to adjust rent
        public BigDecimal finalSecurityDeposit;
    }

    public static class RejectBookingRequest {
        public String rejectionReason;
    }

    public static class CancelBookingRequest {
        public String cancellationReason;
        public Boolean refundDeposit = true;
    }

    public static class ExtendBookingRequest {
        public LocalDate newEndDate;
        public String extensionReason;
        public BigDecimal newMonthlyRent; // Optional rent adjustment
    }

    public static class TerminateBookingRequest {
        public LocalDate terminationDate;
        public String terminationReason;
        public Boolean refundProrata = false;
    }

    // APPROVAL WORKFLOW ENDPOINTS

    // Approve rent booking
    @PostMapping("/rent/{bookingId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> approveRentBooking(@PathVariable Long bookingId, @Valid @RequestBody ApproveBookingRequest req) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User currentUser = userOpt.get();

        Optional<RentBooking> bookingOpt = rentBookingRepo.findById(bookingId);
        if (bookingOpt.isEmpty()) return ResponseEntity.notFound().build();
        RentBooking booking = bookingOpt.get();

        // Verify owner permissions
        if (!canManageBooking(currentUser, booking.getOwner())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not authorized to manage this booking");
        }

        if (booking.getStatus() != RentBooking.BookingStatus.PENDING_APPROVAL) {
            return ResponseEntity.badRequest().body("Booking is not pending approval");
        }

        // Update booking status and details
        booking.setStatus(RentBooking.BookingStatus.ACTIVE);
        booking.setApprovalDate(LocalDateTime.now());
        
        // Allow owner to adjust final rent and deposit
        if (req.finalMonthlyRent != null) {
            booking.setMonthlyRent(req.finalMonthlyRent);
        }
        if (req.finalSecurityDeposit != null) {
            booking.setSecurityDeposit(req.finalSecurityDeposit);
        }

        booking = rentBookingRepo.save(booking);

        // Update property status to RENTED
        Property property = booking.getProperty();
        property.setStatus(Property.PropertyStatus.RENTED);
        propertyRepo.save(property);

        // Generate first monthly payment
        generateMonthlyPayment(booking, null);

        // Send notification to tenant
        notificationService.notifyBookingApproved(booking);

        Map<String, Object> response = new HashMap<>();
        response.put("booking", booking);
        response.put("message", "Booking approved successfully");
        return ResponseEntity.ok(response);
    }


    // Reject rent booking
    @PostMapping("/rent/{bookingId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> rejectRentBooking(@PathVariable Long bookingId, @Valid @RequestBody RejectBookingRequest req) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User currentUser = userOpt.get();

        Optional<RentBooking> bookingOpt = rentBookingRepo.findById(bookingId);
        if (bookingOpt.isEmpty()) return ResponseEntity.notFound().build();
        RentBooking booking = bookingOpt.get();

        if (!canManageBooking(currentUser, booking.getOwner())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not authorized to manage this booking");
        }

        if (booking.getStatus() != RentBooking.BookingStatus.PENDING_APPROVAL) {
            return ResponseEntity.badRequest().body("Booking is not pending approval");
        }

        // Update booking status
        booking.setStatus(RentBooking.BookingStatus.REJECTED);
        booking.setRejectionReason(req.rejectionReason);
        booking = rentBookingRepo.save(booking);

        // Send notification to tenant
        notificationService.notifyBookingRejected(booking, req.rejectionReason);

        Map<String, Object> response = new HashMap<>();
        response.put("booking", booking);
        response.put("message", "Booking rejected");
        return ResponseEntity.ok(response);
    }

    // BOOKING LIFECYCLE MANAGEMENT ENDPOINTS

    // Cancel booking
    @PostMapping("/{bookingId}/cancel")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> cancelBooking(@PathVariable Long bookingId, @Valid @RequestBody CancelBookingRequest req) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User currentUser = userOpt.get();

        // Try rent booking first
        Optional<RentBooking> rentBookingOpt = rentBookingRepo.findById(bookingId);
        if (rentBookingOpt.isPresent()) {
            RentBooking booking = rentBookingOpt.get();
            
            // Check permissions (tenant or owner can cancel)
            if (!canCancelBooking(currentUser, booking.getTenant(), booking.getOwner())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not authorized to cancel this booking");
            }

            booking.setStatus(RentBooking.BookingStatus.CANCELLED);
            booking.setCancellationReason(req.cancellationReason);
            rentBookingRepo.save(booking);

            // Update property status back to FOR_RENT
            Property property = booking.getProperty();
            property.setStatus(Property.PropertyStatus.FOR_RENT);
            propertyRepo.save(property);

            // Handle deposit refund if requested
            if (req.refundDeposit && booking.getSecurityDeposit() != null) {
                walletController.addMoney(booking.getTenant().getId(), booking.getSecurityDeposit(), 
                    "Security deposit refund for cancelled booking", "refund_" + bookingId);
            }

            return ResponseEntity.ok("Rent booking cancelled successfully");
        }

        return ResponseEntity.notFound().build();
    }

    // Get pending approvals for owner
    @GetMapping("/pending-approvals")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> getPendingApprovals(@RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "10") int size) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User currentUser = userOpt.get();
        
        List<RentBooking> pendingRentBookings;
        
        if (currentUser.getRole() == User.Role.ADMIN) {
            pendingRentBookings = rentBookingRepo.findByStatus(RentBooking.BookingStatus.PENDING_APPROVAL);
        } else {
            pendingRentBookings = rentBookingRepo.findByOwner_IdAndStatus(currentUser.getId(), RentBooking.BookingStatus.PENDING_APPROVAL);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("rentBookings", pendingRentBookings);
        response.put("totalPending", pendingRentBookings.size());
        
        return ResponseEntity.ok(response);
    }

    // HELPER METHODS

    private boolean canManageBooking(User currentUser, User bookingOwner) {
        return currentUser.getRole() == User.Role.ADMIN || currentUser.getId().equals(bookingOwner.getId());
    }

    private boolean canCancelBooking(User currentUser, User tenant, User owner) {
        return currentUser.getRole() == User.Role.ADMIN || 
               currentUser.getId().equals(tenant.getId()) || 
               currentUser.getId().equals(owner.getId());
    }

    private void generateMonthlyPayment(RentBooking rentBooking, Object unused) {
        MonthlyPayment payment = new MonthlyPayment();
        
        if (rentBooking != null) {
            payment.setRentBooking(rentBooking);
            payment.setAmount(rentBooking.getMonthlyRent());
            payment.setDueDate(LocalDate.now().withDayOfMonth(1)); // First of current month
        }
        
        payment.setStatus(MonthlyPayment.PaymentStatus.PENDING);
        monthlyPaymentRepo.save(payment);
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
