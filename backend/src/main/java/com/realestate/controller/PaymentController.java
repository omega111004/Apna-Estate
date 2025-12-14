package com.realestate.controller;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import com.realestate.entity.Property;
import com.realestate.entity.PropertyInquiry;
import com.realestate.entity.User;
import com.realestate.repository.PropertyRepository;
import com.realestate.repository.PropertyInquiryRepository;
import com.realestate.repository.UserRepository;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class PaymentController {

    @Value("${razorpay.key.id:}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret:}")
    private String razorpayKeySecret;

    private final PropertyInquiryRepository inquiryRepo;
    private final PropertyRepository propertyRepo;
    private final WalletController walletController;
    private final com.realestate.repository.MonthlyPaymentRepository monthlyPaymentRepo;
    private final UserRepository userRepo;

    public PaymentController(PropertyInquiryRepository inquiryRepo, PropertyRepository propertyRepo, 
                           WalletController walletController,
                           com.realestate.repository.MonthlyPaymentRepository monthlyPaymentRepo,
                           UserRepository userRepo) {
        this.inquiryRepo = inquiryRepo;
        this.propertyRepo = propertyRepo;
        this.walletController = walletController;
        this.monthlyPaymentRepo = monthlyPaymentRepo;
        this.userRepo = userRepo;
    }

    public static class CreateOrderRequest {
        public Long inquiryId;
        public Integer amount; // in INR, optional; default token 10000
    }

    @PostMapping("/order")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> createOrder(@RequestBody CreateOrderRequest req) {
        try {
            if (razorpayKeyId == null || razorpayKeyId.isEmpty() || razorpayKeySecret == null || razorpayKeySecret.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Razorpay keys not configured");
            }
            Optional<PropertyInquiry> inqOpt = inquiryRepo.findById(req.inquiryId);
            if (inqOpt.isEmpty()) return ResponseEntity.notFound().build();
            PropertyInquiry inq = inqOpt.get();
            if (inq.getStatus() != PropertyInquiry.InquiryStatus.AGREED) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Deal is not agreed yet");
            }

            // Use the agreed price from inquiry if not specified in request
            int amountInInr;
            if (req.amount != null && req.amount > 0) {
                amountInInr = req.amount;
            } else if (inq.getAgreedPrice() != null) {
                amountInInr = inq.getAgreedPrice().intValue();
            } else {
                amountInInr = 10000; // fallback token amount
            }
            
            // Razorpay test mode limit is ₹1,00,000 (1 lakh)
            // Production mode can handle up to ₹10,00,000 (10 lakhs) or more
            if (amountInInr > 100000) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Payment amount (₹" + amountInInr + ") exceeds Razorpay transaction limit. " +
                          "For amounts above ₹1,00,000, please use production Razorpay keys or contact support.");
            }
            
            int amountInPaise = amountInInr * 100;

            RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("payment_capture", 1);
            orderRequest.put("receipt", "inq_" + inq.getId());

            Order order = client.orders.create(orderRequest);

            Map<String, Object> resp = new HashMap<>();
            resp.put("orderId", order.get("id"));
            resp.put("amount", order.get("amount"));
            resp.put("currency", order.get("currency"));
            resp.put("keyId", razorpayKeyId);
            resp.put("inquiryId", inq.getId());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Order creation failed: " + e.getMessage());
        }
    }

    public static class VerifyRequest {
        public Long inquiryId;
        public String razorpay_order_id;
        public String razorpay_payment_id;
        public String razorpay_signature;
    }

    @PostMapping("/verify")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> verifyPayment(@RequestBody VerifyRequest req) {
        try {
            System.out.println("=== PAYMENT VERIFICATION START ===");
            System.out.println("Inquiry ID: " + req.inquiryId);
            
            if (razorpayKeySecret == null || razorpayKeySecret.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Razorpay secret not configured");
            }
            String payload = req.razorpay_order_id + '|' + req.razorpay_payment_id;
            boolean isValid = Utils.verifySignature(payload, req.razorpay_signature, razorpayKeySecret);
            if (!isValid) {
                System.out.println("Invalid Razorpay signature!");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
            }

            System.out.println("Razorpay signature verified successfully");
            
            Optional<PropertyInquiry> inqOpt = inquiryRepo.findById(req.inquiryId);
            if (inqOpt.isEmpty()) {
                System.out.println("Inquiry not found!");
                return ResponseEntity.notFound().build();
            }
            
            PropertyInquiry inq = inqOpt.get();
            System.out.println("Found inquiry: " + inq.getId() + ", current status: " + inq.getStatus());
            System.out.println("Property ID: " + inq.getProperty().getId());
            System.out.println("Property title: " + inq.getProperty().getTitle());
            System.out.println("Property current status: " + inq.getProperty().getStatus());
            
            // Update inquiry status
            inq.setStatus(PropertyInquiry.InquiryStatus.PURCHASED);
            inq = inquiryRepo.save(inq);
            System.out.println("Inquiry saved with status: " + inq.getStatus());

            // Mark property SOLD
            Property property = inq.getProperty();
            System.out.println("Updating property status from " + property.getStatus() + " to SOLD");
            property.setStatus(Property.PropertyStatus.SOLD);
            property = propertyRepo.save(property);
            System.out.println("Property saved with status: " + property.getStatus());
            System.out.println("Property ID after save: " + property.getId());

            // Deduct token amount from customer's wallet (optional, if wallet used for record-keeping)
            try {
                BigDecimal tokenAmount = new BigDecimal("10000"); // Default token amount (INR)
                walletController.deductMoney(inq.getClient().getId(), tokenAmount,
                        "Token payment for property booking - Inquiry #" + inq.getId(),
                        req.razorpay_payment_id);
            } catch (Exception ignored) {}

            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "success");
            resp.put("inquiryId", inq.getId());
            resp.put("propertyId", property.getId());
            resp.put("dealStatus", inq.getStatus().name());
            resp.put("propertyStatus", property.getStatus().name()); // Add property status to response
            
            System.out.println("=== PAYMENT VERIFICATION COMPLETE ===");
            System.out.println("Response: " + resp);
            
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            System.err.println("Payment verification error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Verification failed: " + e.getMessage());
        }
    }

    // ===== Monthly Rent Payment Endpoints =====

    @PostMapping("/rent/create-order/{paymentId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> createRentPaymentOrder(@PathVariable Long paymentId,
                                                    org.springframework.security.core.Authentication auth) {
        try {
            if (razorpayKeyId == null || razorpayKeyId.isEmpty() || razorpayKeySecret == null || razorpayKeySecret.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Razorpay keys not configured");
            }

            // Get current user
            String username = auth.getName();
            Optional<User> userOpt = userRepo.findByUsername(username);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            User user = userOpt.get();

            // Get payment
            Optional<com.realestate.entity.MonthlyPayment> paymentOpt = monthlyPaymentRepo.findById(paymentId);
            if (paymentOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            com.realestate.entity.MonthlyPayment payment = paymentOpt.get();

            // Verify user is the tenant
            if (payment.getRentBooking() != null) {
                if (!payment.getRentBooking().getTenant().getId().equals(user.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You are not authorized to pay this rent");
                }
            }

            // Check if payment is already paid
            if (payment.getStatus() == com.realestate.entity.MonthlyPayment.PaymentStatus.PAID) {
                return ResponseEntity.badRequest().body("Payment is already completed");
            }

            // Create Razorpay order
            int amountInPaise = payment.getAmount().multiply(new BigDecimal("100")).intValue();
            String receiptId = "rent_payment_" + paymentId + "_" + System.currentTimeMillis();

            RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("payment_capture", 1);
            orderRequest.put("receipt", receiptId);

            Order order = client.orders.create(orderRequest);

            // Prepare response
            Map<String, Object> response = new HashMap<>();
            response.put("orderId", order.get("id"));
            response.put("amount", order.get("amount"));
            response.put("currency", order.get("currency"));
            response.put("keyId", razorpayKeyId);
            response.put("paymentId", paymentId);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Failed to create payment order: " + e.getMessage());
        }
    }

    public static class VerifyRentPaymentRequest {
        public Long paymentId;
        public String razorpay_order_id;
        public String razorpay_payment_id;
        public String razorpay_signature;
    }

    @PostMapping("/rent/verify")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> verifyRentPayment(@RequestBody VerifyRentPaymentRequest req,
                                              org.springframework.security.core.Authentication auth) {
        try {
            if (razorpayKeySecret == null || razorpayKeySecret.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Razorpay secret not configured");
            }

            // Verify signature
            String payload = req.razorpay_order_id + '|' + req.razorpay_payment_id;
            boolean isValid = Utils.verifySignature(payload, req.razorpay_signature, razorpayKeySecret);
            if (!isValid) {
                return ResponseEntity.badRequest().body("Invalid payment signature");
            }

            // Get current user
            String username = auth.getName();
            Optional<User> userOpt = userRepo.findByUsername(username);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            // Get payment
            Optional<com.realestate.entity.MonthlyPayment> paymentOpt = monthlyPaymentRepo.findById(req.paymentId);
            if (paymentOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            com.realestate.entity.MonthlyPayment payment = paymentOpt.get();

            // Update payment status
            payment.setStatus(com.realestate.entity.MonthlyPayment.PaymentStatus.PAID);
            payment.setPaidDate(java.time.LocalDate.now());
            payment.setPaymentReference(req.razorpay_payment_id);
            monthlyPaymentRepo.save(payment);

            // Generate next month's payment if needed
            if (payment.getRentBooking() != null) {
                generateNextMonthPayment(payment);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Payment completed successfully");
            response.put("payment", payment);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Payment verification failed: " + e.getMessage());
        }
    }

    @GetMapping("/razorpay-key")
    public ResponseEntity<Map<String, String>> getRazorpayKey() {
        Map<String, String> response = new HashMap<>();
        response.put("keyId", razorpayKeyId);
        return ResponseEntity.ok(response);
    }

    private void generateNextMonthPayment(com.realestate.entity.MonthlyPayment currentPayment) {
        // Find the next due date
        java.time.LocalDate nextDueDate = currentPayment.getDueDate().plusMonths(1);
        
        // Check if next month's payment already exists
        boolean exists = monthlyPaymentRepo.findAll().stream()
            .anyMatch(p -> p.getRentBooking() != null 
                && p.getRentBooking().getId().equals(currentPayment.getRentBooking().getId())
                && p.getDueDate().equals(nextDueDate));
        
        if (!exists) {
            com.realestate.entity.MonthlyPayment nextPayment = new com.realestate.entity.MonthlyPayment();
            nextPayment.setRentBooking(currentPayment.getRentBooking());
            nextPayment.setAmount(currentPayment.getAmount());
            nextPayment.setDueDate(nextDueDate);
            nextPayment.setStatus(com.realestate.entity.MonthlyPayment.PaymentStatus.PENDING);
            monthlyPaymentRepo.save(nextPayment);
        }
    }
}
