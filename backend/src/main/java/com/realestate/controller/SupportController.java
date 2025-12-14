package com.realestate.controller;

import com.realestate.entity.SupportMessage;
import com.realestate.entity.User;
import com.realestate.repository.SupportMessageRepository;
import com.realestate.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/support")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class SupportController {

    @Autowired
    private SupportMessageRepository supportMessageRepository;

    @Autowired
    private UserRepository userRepository;

    // Public endpoint: Submit support message
    @PostMapping("/submit")
    public ResponseEntity<?> submitSupportMessage(@Valid @RequestBody SupportMessageRequest request, Authentication authentication) {
        try {
            SupportMessage supportMessage = new SupportMessage();
            supportMessage.setName(request.getName());
            supportMessage.setEmail(request.getEmail());
            supportMessage.setSubject(request.getSubject());
            supportMessage.setMessage(request.getMessage());
            supportMessage.setStatus(SupportMessage.Status.PENDING);

            // If user is authenticated, link the message to their account
            if (authentication != null && authentication.isAuthenticated()) {
                Optional<User> userOpt = userRepository.findByUsername(authentication.getName());
                userOpt.ifPresent(supportMessage::setUser);
            }

            supportMessage = supportMessageRepository.save(supportMessage);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Support message submitted successfully");
            response.put("id", supportMessage.getId());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to submit support message"));
        }
    }

    // Admin endpoint: Get all support messages
    @GetMapping("/messages")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SupportMessage>> getAllSupportMessages() {
        List<SupportMessage> messages = supportMessageRepository.findAllByOrderByCreatedAtDesc();
        return ResponseEntity.ok(messages);
    }

    // Admin endpoint: Get support messages by status
    @GetMapping("/messages/status/{status}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SupportMessage>> getSupportMessagesByStatus(@PathVariable String status) {
        try {
            SupportMessage.Status statusEnum = SupportMessage.Status.valueOf(status.toUpperCase());
            List<SupportMessage> messages = supportMessageRepository.findByStatusOrderByCreatedAtDesc(statusEnum);
            return ResponseEntity.ok(messages);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // Admin endpoint: Get support message by ID
    @GetMapping("/messages/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SupportMessage> getSupportMessageById(@PathVariable Long id) {
        Optional<SupportMessage> message = supportMessageRepository.findById(id);
        return message.map(ResponseEntity::ok)
                     .orElse(ResponseEntity.notFound().build());
    }

    // Admin endpoint: Update support message status
    @PatchMapping("/messages/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateSupportMessageStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        Optional<SupportMessage> messageOpt = supportMessageRepository.findById(id);
        if (messageOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SupportMessage message = messageOpt.get();
        try {
            SupportMessage.Status newStatus = SupportMessage.Status.valueOf(request.get("status").toUpperCase());
            message.setStatus(newStatus);
            supportMessageRepository.save(message);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Status updated successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Invalid status"));
        }
    }

    // Admin endpoint: Add admin notes
    @PatchMapping("/messages/{id}/notes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateAdminNotes(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        Optional<SupportMessage> messageOpt = supportMessageRepository.findById(id);
        if (messageOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SupportMessage message = messageOpt.get();
        message.setAdminNotes(request.get("notes"));
        supportMessageRepository.save(message);
        return ResponseEntity.ok(Map.of("status", "success", "message", "Notes updated successfully"));
    }

    // Admin endpoint: Get support statistics
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getSupportStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total", supportMessageRepository.count());
        stats.put("pending", supportMessageRepository.countByStatus(SupportMessage.Status.PENDING));
        stats.put("inProgress", supportMessageRepository.countByStatus(SupportMessage.Status.IN_PROGRESS));
        stats.put("resolved", supportMessageRepository.countByStatus(SupportMessage.Status.RESOLVED));
        stats.put("closed", supportMessageRepository.countByStatus(SupportMessage.Status.CLOSED));
        return ResponseEntity.ok(stats);
    }

    // DTO for support message request
    public static class SupportMessageRequest {
        private String name;
        private String email;
        private String subject;
        private String message;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
}

