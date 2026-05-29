package com.cyberbank.service;

import com.cyberbank.entity.OtpRecord;
import com.cyberbank.entity.User;
import com.cyberbank.enums.OtpType;
import com.cyberbank.repository.OtpRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final OtpRepository otpRepository;
    private final JavaMailSender mailSender;

    @Value("${app.otp.expiration}")
    private int otpExpiration;

    @Value("${spring.mail.username}")
    private String fromEmail;

    private static final SecureRandom random = new SecureRandom();

    public String generateAndSendOtp(User user, OtpType otpType) {
        // Invalidate old OTPs
        otpRepository.invalidateAllOtps(user.getId(), otpType);

        // Generate 6-digit OTP
        String otpCode = String.format("%06d", random.nextInt(999999));

        // Save OTP
        OtpRecord otpRecord = OtpRecord.builder()
                .user(user)
                .otpCode(otpCode)
                .otpType(otpType)
                .isUsed(false)
                .expiresAt(LocalDateTime.now().plusSeconds(otpExpiration))
                .build();

        otpRepository.save(otpRecord);

        // Send email
        sendOtpEmail(user, otpCode, otpType);

        log.info("OTP generated for user: {} type: {}", user.getUsername(), otpType);
        return otpCode;
    }

    public boolean validateOtp(User user, String otpCode, OtpType otpType) {
        Optional<OtpRecord> otpRecord = otpRepository.findLatestValidOtp(user.getId(), otpType);

        if (otpRecord.isEmpty()) {
            log.warn("No valid OTP found for user: {}", user.getUsername());
            return false;
        }

        OtpRecord otp = otpRecord.get();

        if (otp.isExpired()) {
            log.warn("OTP expired for user: {}", user.getUsername());
            return false;
        }

        if (!otp.getOtpCode().equals(otpCode)) {
            log.warn("Invalid OTP for user: {}", user.getUsername());
            return false;
        }

        // Mark as used
        otp.setIsUsed(true);
        otpRepository.save(otp);

        log.info("OTP validated successfully for user: {}", user.getUsername());
        return true;
    }

    private void sendOtpEmail(User user, String otpCode, OtpType otpType) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(user.getEmail());
            message.setSubject(getEmailSubject(otpType));
            message.setText(getEmailBody(user.getFullName(), otpCode, otpType));
            mailSender.send(message);
            log.info("OTP email sent to: {}", user.getEmail());
        } catch (Exception e) {
            log.error("Failed to send OTP email: {}", e.getMessage());
            // In production, you might want to use SMS as fallback
        }
    }

    private String getEmailSubject(OtpType otpType) {
        return switch (otpType) {
            case LOGIN -> "[CyberBank] Login Verification Code";
            case TRANSACTION -> "[CyberBank] Transaction Authorization Code";
            case LOAN -> "[CyberBank] Loan Application Verification";
            case PASSWORD_RESET -> "[CyberBank] Password Reset Code";
        };
    }

    private String getEmailBody(String name, String otp, OtpType otpType) {
        String action = switch (otpType) {
            case LOGIN -> "login to your account";
            case TRANSACTION -> "authorize your transaction";
            case LOAN -> "submit your loan application";
            case PASSWORD_RESET -> "reset your password";
        };

        return String.format("""
                CYBERBANK SECURE NOTIFICATION
                ==============================
                
                Hello %s,
                
                Your verification code to %s is:
                
                >>>  %s  <<<
                
                This code expires in 5 minutes.
                DO NOT share this code with anyone.
                
                If you did not request this, please contact support immediately.
                
                -- CyberBank Security Team
                """, name, action, otp);
    }
}
