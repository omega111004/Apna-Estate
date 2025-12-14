package com.realestate.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Nullable
    private final JavaMailSender mailSender;

    private final String fromAddress;

    public EmailService(@Nullable JavaMailSender mailSender,
            @Value("${spring.mail.from}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    public boolean isConfigured() {
        return mailSender != null && StringUtils.hasText(fromAddress);
    }

    public boolean sendSimpleMessage(String to, String subject, String body) {
        if (!isConfigured()) {
            log.warn("Mail service not fully configured. Email to {} with subject '{}' body:\n{}", to, subject, body);
            return false;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            message.setFrom("ApnaEstate - Real Estate Portal <" + fromAddress + ">");
            mailSender.send(message);
            return true;
        } catch (Exception ex) {
            log.error("Failed to send email to {}: {}", to, ex.getMessage());
            log.info("Email body for {} (subject: {}):\n{}", to, subject, body);
            return false;
        }
    }
}
