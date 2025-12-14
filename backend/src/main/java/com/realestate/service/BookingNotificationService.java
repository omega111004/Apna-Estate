package com.realestate.service;

import com.realestate.entity.*;
import com.realestate.repository.BookingNotificationRepository;
import com.realestate.repository.NotificationRepository;
import com.realestate.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class BookingNotificationService {

    @Autowired
    private BookingNotificationRepository notificationRepo;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository generalNotificationRepo;

    // Create notification for booking events
    public BookingNotification createNotification(User user, BookingNotification.NotificationType type, 
                                                String title, String message, String actionUrl,
                                                RentBooking rentBooking) {
        BookingNotification notification = new BookingNotification();
        notification.setUser(user);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setActionUrl(actionUrl);
        notification.setRentBooking(rentBooking);
        
        // Set priority based on notification type
        switch (type) {
            case BOOKING_REJECTED:
            case PAYMENT_OVERDUE:
            case BOOKING_TERMINATED:
                notification.setPriority(BookingNotification.NotificationPriority.HIGH);
                break;
            case BOOKING_APPROVED:
            case PAYMENT_DUE:
            case BOOKING_CANCELLED:
                notification.setPriority(BookingNotification.NotificationPriority.MEDIUM);
                break;
            default:
                notification.setPriority(BookingNotification.NotificationPriority.LOW);
        }
        
        return notificationRepo.save(notification);
    }

    private void createGeneralNotification(User user, String title, String message, String actionUrl) {
        if (user == null) {
            return;
        }
        Notification notification = new Notification();
        notification.setRecipient(user);
        notification.setType(Notification.Type.SYSTEM);
        notification.setTitle(title);
        notification.setBody(message);
        notification.setLink(actionUrl);
        generalNotificationRepo.save(notification);
    }

    // Notify about new booking request
    public void notifyBookingCreated(RentBooking booking) {
        // Notify property owner
        String title = "New Booking Request";
        String message = String.format("New booking request for property '%s' from %s %s", 
            booking.getProperty().getTitle(),
            booking.getTenant().getFirstName(),
            booking.getTenant().getLastName());
        String actionUrl = "/bookings/owner";
        
        createNotification(booking.getOwner(), BookingNotification.NotificationType.BOOKING_CREATED,
                          title, message, actionUrl, booking);
    }

    // Notify about booking approval
    public void notifyBookingApproved(RentBooking booking) {
        String title = "Booking Approved!";
        String message = String.format("Your booking request for '%s' has been approved! You can now proceed with payment.", 
            booking.getProperty().getTitle());
        String actionUrl = "/bookings";
        
        createNotification(booking.getTenant(), BookingNotification.NotificationType.BOOKING_APPROVED,
                          title, message, actionUrl, booking);
    }

    // Notify about booking rejection
    public void notifyBookingRejected(RentBooking booking, String reason) {
        String title = "Booking Request Rejected";
        String message = String.format("Your booking request for '%s' has been rejected.", 
            booking.getProperty().getTitle());
        if (reason != null && !reason.trim().isEmpty()) {
            message += " Reason: " + reason;
        }
        String actionUrl = "/properties/" + booking.getProperty().getId();
        
        createNotification(booking.getTenant(), BookingNotification.NotificationType.BOOKING_REJECTED,
                          title, message, actionUrl, booking);
    }

    // Notify about payment due
    public void notifyPaymentDue(MonthlyPayment payment) {
        if (payment.getRentBooking() == null) return;

        User tenant = payment.getRentBooking().getTenant();
        String propertyName = payment.getRentBooking().getProperty().getTitle();
        
        String title = "Rent Payment Due";
        String message = String.format("Your rent payment of ₹%s for '%s' is due on %s", 
            payment.getAmount().toString(), propertyName, payment.getDueDate().toString());
        String actionUrl = "/bookings";
        
        BookingNotification.NotificationType type = payment.getDueDate().isBefore(LocalDateTime.now().toLocalDate()) ?
            BookingNotification.NotificationType.PAYMENT_OVERDUE : BookingNotification.NotificationType.PAYMENT_DUE;
        
        createNotification(tenant, type, title, message, actionUrl, payment.getRentBooking());
    }

    // Notify about payment received
    public void notifyPaymentReceived(MonthlyPayment payment) {
        if (payment.getRentBooking() == null) return;

        User owner = payment.getRentBooking().getOwner();
        String propertyName = payment.getRentBooking().getProperty().getTitle();
        
        String title = "Payment Received";
        String message = String.format("Rent payment of ₹%s received for '%s'", 
            payment.getAmount().toString(), propertyName);
        String actionUrl = "/bookings/owner";
        
        createNotification(owner, BookingNotification.NotificationType.PAYMENT_RECEIVED,
                          title, message, actionUrl, payment.getRentBooking());
    }

    // Get unread notifications for user
    public List<BookingNotification> getUnreadNotifications(Long userId) {
        return notificationRepo.findByUser_IdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    // Get all notifications for user with pagination
    public List<BookingNotification> getAllNotifications(Long userId) {
        return notificationRepo.findByUser_IdOrderByCreatedAtDesc(userId);
    }

    // Mark notification as read
    public void markAsRead(Long notificationId, Long userId) {
        notificationRepo.findById(notificationId).ifPresent(notification -> {
            if (notification.getUser().getId().equals(userId)) {
                notification.setIsRead(true);
                notificationRepo.save(notification);
            }
        });
    }

    // Mark all notifications as read for user
    public void markAllAsRead(Long userId) {
        notificationRepo.markAllAsReadForUser(userId);
    }

    // Count unread notifications
    public Long countUnreadNotifications(Long userId) {
        return notificationRepo.countByUser_IdAndIsReadFalse(userId);
    }

    // Clean up old notifications
    public void cleanupOldNotifications() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(90); // Keep notifications for 90 days
        notificationRepo.deleteOldReadNotifications(cutoffDate);
    }
    // Notify about property approval (Agent + All Clients)
    public void notifyPropertyApproved(Property property) {
        String propertyTitle = property.getTitle() != null ? property.getTitle() : "New Property";
        String propertyCity = property.getCity() != null ? property.getCity() : "the city";
        String agentName = (property.getOwner() != null) ? property.getOwner().getFullName() : "one of our verified agents";

        // 1. Notify the Agent (Owner)
        if (property.getOwner() != null) {
            String title = "Property Approved";
            String message = String.format("Great news %s! Your property '%s' has been approved and is now live for clients.",
                    property.getOwner().getFirstName(), propertyTitle);
            String actionUrl = "/properties/" + property.getId();
            createNotification(property.getOwner(), BookingNotification.NotificationType.PROPERTY_APPROVED,
                    title, message, actionUrl, null);
            createGeneralNotification(property.getOwner(), title, message, actionUrl);
        }

        // 2. Notify all Clients (Users) with the agent's name highlighted
        List<User> clients = userRepository.findByRoleAndEnabledTrue(User.Role.USER);
        String clientTitle = String.format("New listing from %s", agentName);
        String clientMessage = String.format("%s just published '%s' in %s. Tap to view full details and connect with the agent.",
                agentName, propertyTitle, propertyCity);
        String clientActionUrl = "/properties/" + property.getId();

        for (User client : clients) {
            createNotification(client, BookingNotification.NotificationType.PROPERTY_APPROVED,
                    clientTitle, clientMessage, clientActionUrl, null);
            createGeneralNotification(client, clientTitle, clientMessage, clientActionUrl);
        }
    }

    // Notify about property rejection
    public void notifyPropertyRejected(Property property) {
        if (property.getOwner() != null) {
            String title = "Property Rejected";
            String message = String.format("Your property '%s' has been rejected by the admin.", property.getTitle());
            String actionUrl = "/dashboard/agent"; // Redirect to agent dashboard to see status
            createNotification(property.getOwner(), BookingNotification.NotificationType.PROPERTY_REJECTED, 
                               title, message, actionUrl, null);
            createGeneralNotification(property.getOwner(), title, message, actionUrl);
        }
    }
}
