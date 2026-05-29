package com.cyberbank.service;

import com.cyberbank.entity.BankAccount;
import com.cyberbank.entity.User;
import com.cyberbank.enums.AccountType;
import com.cyberbank.enums.OtpType;
import com.cyberbank.enums.Role;
import com.cyberbank.exception.CyberBankException;
import com.cyberbank.repository.BankAccountRepository;
import com.cyberbank.repository.UserRepository;
import com.cyberbank.security.JwtUtil;
import com.cyberbank.util.AccountNumberGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final BankAccountRepository bankAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final OtpService otpService;
    private final AuditService auditService;

    @Transactional
    public Map<String, Object> register(String username, String email, String password,
                                         String fullName, String phone) {
        if (userRepository.existsByUsername(username)) {
            throw new CyberBankException("Username already taken");
        }
        if (userRepository.existsByEmail(email)) {
            throw new CyberBankException("Email already registered");
        }
        if (userRepository.existsByPhone(phone)) {
            throw new CyberBankException("Phone already registered");
        }

        User user = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .fullName(fullName)
                .phone(phone)
                .role(Role.USER)
                .isActive(true)
                .isTwoFactorEnabled(true)
                .build();

        user = userRepository.save(user);

        // Auto-create savings account
        BankAccount account = BankAccount.builder()
                .user(user)
                .accountNumber(AccountNumberGenerator.generate())
                .accountType(AccountType.SAVINGS)
                .build();
        bankAccountRepository.save(account);

        // Send registration OTP for verification
        otpService.generateAndSendOtp(user, OtpType.LOGIN);

        auditService.log(user, "USER_REGISTERED", "User", user.getId(), "New user registered");

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Registration successful! OTP sent to " + email);
        response.put("username", username);
        response.put("requiresOtp", true);
        return response;
    }

    public Map<String, Object> login(String username, String password) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );
        } catch (BadCredentialsException e) {
            throw new CyberBankException("Invalid credentials");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new CyberBankException("User not found"));

        if (!user.getIsActive()) {
            throw new CyberBankException("Account is disabled");
        }

        Map<String, Object> response = new HashMap<>();

        if (user.getIsTwoFactorEnabled()) {
            // Send OTP
            otpService.generateAndSendOtp(user, OtpType.LOGIN);
            response.put("twoFactorRequired", true);
            response.put("message", "OTP sent to " + maskEmail(user.getEmail()));
            response.put("username", username);
        } else {
            // Direct login without 2FA
            String token = jwtUtil.generateToken(user);
            String refreshToken = jwtUtil.generateRefreshToken(user);
            response.put("token", token);
            response.put("refreshToken", refreshToken);
            response.put("twoFactorRequired", false);
            response.put("user", buildUserInfo(user));
        }

        auditService.log(user, "LOGIN_ATTEMPT", "User", user.getId(), "Login attempt");
        return response;
    }

    public Map<String, Object> verifyOtp(String username, String otp, OtpType otpType) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new CyberBankException("User not found"));

        boolean valid = otpService.validateOtp(user, otp, otpType);
        if (!valid) {
            throw new CyberBankException("Invalid or expired OTP");
        }

        String token = jwtUtil.generateToken(user);
        String refreshToken = jwtUtil.generateRefreshToken(user);

        auditService.log(user, "OTP_VERIFIED", "User", user.getId(), "2FA login successful");

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("refreshToken", refreshToken);
        response.put("user", buildUserInfo(user));
        response.put("message", "Authentication successful");
        return response;
    }

    public Map<String, Object> resendOtp(String username, OtpType otpType) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new CyberBankException("User not found"));

        otpService.generateAndSendOtp(user, otpType);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "OTP resent to " + maskEmail(user.getEmail()));
        return response;
    }

    private Map<String, Object> buildUserInfo(User user) {
        Map<String, Object> info = new HashMap<>();
        info.put("id",        user.getId());
        info.put("username",  user.getUsername());
        info.put("email",     user.getEmail());
        info.put("fullName",  user.getFullName());
        info.put("phone",     user.getPhone());
        // role as plain string so frontend role === 'ADMIN' check works reliably
        info.put("role",      user.getRole().name());
        info.put("isActive",  user.getIsActive());
        return info;
    }

    private String maskEmail(String email) {
        int atIndex = email.indexOf('@');
        if (atIndex <= 2) return email;
        return email.charAt(0) + "***" + email.substring(atIndex);
    }

    // ── Forgot Password: Step 1 — send reset OTP ─────────────────────────────
    public Map<String, Object> forgotPassword(String identifier) {
        // Accept username OR email
        User user = userRepository.findByUsername(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElseThrow(() -> new CyberBankException("No account found for: " + identifier));

        if (!user.getIsActive()) {
            throw new CyberBankException("Account is disabled. Contact support.");
        }

        otpService.generateAndSendOtp(user, OtpType.PASSWORD_RESET);
        auditService.log(user, "PASSWORD_RESET_REQUESTED", "User", user.getId(), "Reset OTP sent");

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Password reset OTP sent to " + maskEmail(user.getEmail()));
        response.put("username", user.getUsername());
        response.put("maskedEmail", maskEmail(user.getEmail()));
        return response;
    }

    // ── Forgot Password: Step 2 — verify OTP ─────────────────────────────────
    public Map<String, Object> verifyResetOtp(String username, String otp) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new CyberBankException("User not found"));

        boolean valid = otpService.validateOtp(user, otp, OtpType.PASSWORD_RESET);
        if (!valid) {
            throw new CyberBankException("Invalid or expired OTP");
        }

        // Issue a short-lived reset token (reuse JWT with special claim)
        java.util.Map<String, Object> claims = new HashMap<>();
        claims.put("purpose", "password_reset");
        String resetToken = jwtUtil.generateToken(claims, user);

        auditService.log(user, "RESET_OTP_VERIFIED", "User", user.getId(), "Password reset OTP verified");

        Map<String, Object> response = new HashMap<>();
        response.put("resetToken", resetToken);
        response.put("message", "OTP verified. Set your new password.");
        return response;
    }

    // ── Forgot Password: Step 3 — set new password ────────────────────────────
    @Transactional
    public Map<String, Object> resetPassword(String username, String newPassword, String resetToken) {
        // Validate the reset token belongs to this user
        String tokenUsername;
        try {
            tokenUsername = jwtUtil.extractUsername(resetToken);
        } catch (Exception e) {
            throw new CyberBankException("Invalid or expired reset session. Start over.");
        }

        if (!tokenUsername.equals(username)) {
            throw new CyberBankException("Reset token mismatch");
        }

        if (newPassword == null || newPassword.length() < 8) {
            throw new CyberBankException("Password must be at least 8 characters");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new CyberBankException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        auditService.log(user, "PASSWORD_RESET_SUCCESS", "User", user.getId(), "Password changed via reset flow");

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Password updated successfully. Please login.");
        return response;
    }

}