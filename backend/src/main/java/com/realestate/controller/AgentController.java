package com.realestate.controller;

import com.realestate.entity.User;
import com.realestate.entity.Property;
import com.realestate.entity.PropertyInquiry;
import com.realestate.entity.Notification;
import com.realestate.repository.UserRepository;
import com.realestate.repository.PropertyRepository;
import com.realestate.repository.PropertyInquiryRepository;
import com.realestate.repository.NotificationRepository;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

import com.realestate.service.EmailService;

@RestController
@RequestMapping("/api/agents")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "http://127.0.0.1:5173", "http://127.0.0.1:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class AgentController {

    private static final Logger log = LoggerFactory.getLogger(AgentController.class);

    @Autowired private UserRepository userRepo;
    @Autowired private PropertyRepository propertyRepo;
    @Autowired private PropertyInquiryRepository inquiryRepo;
    @Autowired private NotificationRepository notificationRepo;
    @Autowired private EmailService emailService;

    @Autowired private com.realestate.repository.AgentMessageRepository messageRepo;

    public static class MessageRequest {
        public Long propertyId; // optional context
        @NotBlank public String name;
        @Email public String email;
        public String phone;
        @NotBlank public String message;
    }

    // Public: send a message to an agent's email
    @PostMapping("/{agentId}/message")
    public ResponseEntity<?> messageAgent(@PathVariable Long agentId, @RequestBody MessageRequest req) {
        Optional<User> agentOpt = userRepo.findById(agentId);
        if (agentOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Agent not found");
        User agent = agentOpt.get();
        
        // Save message to database
        com.realestate.entity.AgentMessage msg = new com.realestate.entity.AgentMessage();
        msg.setAgent(agent);
        if (req.propertyId != null) {
            propertyRepo.findById(req.propertyId).ifPresent(msg::setProperty);
        }
        msg.setSenderName(req.name);
        msg.setSenderEmail(req.email);
        msg.setSenderPhone(req.phone);
        msg.setMessage(req.message);
        messageRepo.save(msg);

        if (agent.getEmail() == null || agent.getEmail().isBlank()) {
            // Even if email fails/missing, we saved the message.
            return ResponseEntity.ok(Map.of("status", "saved_no_email"));
        }
        
        String subject = "New inquiry from " + (req.name != null ? req.name : "Prospect") + (req.propertyId != null ? " about property #" + req.propertyId : "");
        StringBuilder body = new StringBuilder();
        body.append("You have received a new inquiry from the RealEstate Hub website.\n\n");
        if (req.propertyId != null) body.append("Property ID: ").append(req.propertyId).append("\n");
        if (req.name != null) body.append("Name: ").append(req.name).append("\n");
        if (req.email != null) body.append("Email: ").append(req.email).append("\n");
        if (req.phone != null) body.append("Phone: ").append(req.phone).append("\n");
        body.append("\nMessage:\n").append(req.message != null ? req.message : "").append("\n");

        boolean emailSent = false;
        try {
            emailSent = emailService.sendSimpleMessage(agent.getEmail(), subject, body.toString());
        } catch (Exception e) {
            log.error("Failed to send email to agent {}: {}", agent.getId(), e.getMessage());
        }

        if (!emailSent) {
            // Message is stored, but email delivery failed; surface this to the client.
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                            "status", "email_failed",
                            "message", "Your message was saved, but the email could not be delivered to the agent right now."
                    ));
        }

        // If user is authenticated and property context is present, create a PropertyInquiry and notify the agent.
        try {
            if (req.propertyId != null) {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated()) {
                    Optional<Property> propOpt = propertyRepo.findById(req.propertyId);
                    if (propOpt.isPresent()) {
                        Property property = propOpt.get();
                        Optional<User> currentOpt;
                        Object principal = auth.getPrincipal();
                        if (principal instanceof org.springframework.security.core.userdetails.User userDetails) {
                            currentOpt = userRepo.findByEmailAndEnabledTrue(userDetails.getUsername());
                        } else if (principal instanceof User u) {
                            currentOpt = Optional.of(u);
                        } else {
                            currentOpt = Optional.empty();
                        }
                        if (currentOpt.isPresent()) {
                            User customer = currentOpt.get();
                            // Create basic inquiry record in the new system
                            PropertyInquiry inquiry = new PropertyInquiry();
                            inquiry.setProperty(property);
                            inquiry.setClient(customer);
                            inquiry.setOwner(agent);
                            inquiry.setStatus(PropertyInquiry.InquiryStatus.ACTIVE);
                            inquiryRepo.save(inquiry);

                            // Create notification for agent
                            Notification n = new Notification();
                            n.setRecipient(agent);
                            n.setType(Notification.Type.INQUIRY_NEW);
                            n.setTitle("New sale inquiry");
                            n.setBody("From: " + customer.getFirstName() + " " + customer.getLastName() + "\nProperty ID: " + property.getId());
                            n.setLink("/inquiries/owner");
                            notificationRepo.save(n);
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @GetMapping("/messages")
    public ResponseEntity<?> getMyMessages() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
             return ResponseEntity.status(401).body("Not authenticated");
        }
        
        boolean isAgent = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_AGENT") || a.getAuthority().equals("ROLE_ADMIN"));
        
        if (!isAgent) {
             return ResponseEntity.status(403).body("Access Denied: Requires AGENT or ADMIN role. Current roles: " + auth.getAuthorities());
        }

        String email = auth.getName();
        User agent = userRepo.findByEmail(email).orElseThrow(() -> new RuntimeException("Agent not found"));
        return ResponseEntity.ok(messageRepo.findByAgentIdOrderByCreatedAtDesc(agent.getId()));
    }
}
