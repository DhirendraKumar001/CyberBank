package com.cyberbank.controller;

import com.cyberbank.enums.OtpType;
import com.cyberbank.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> req) {
        Map<String, Object> response = authService.register(
                req.get("username"),
                req.get("email"),
                req.get("password"),
                req.get("fullName"),
                req.get("phone")
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> req) {
        Map<String, Object> response = authService.login(
                req.get("username"),
                req.get("password")
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody Map<String, String> req) {
        OtpType type = OtpType.valueOf(req.getOrDefault("otpType", "LOGIN"));
        Map<String, Object> response = authService.verifyOtp(
                req.get("username"),
                req.get("otp"),
                type
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, Object>> resendOtp(@RequestBody Map<String, String> req) {
        OtpType type = OtpType.valueOf(req.getOrDefault("otpType", "LOGIN"));
        Map<String, Object> response = authService.resendOtp(req.get("username"), type);
        return ResponseEntity.ok(response);
    }

    // ── Step 1: Request password reset OTP ───────────────────────────────────
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@RequestBody Map<String, String> req) {
        String identifier = req.get("identifier"); // username or email
        if (identifier == null || identifier.isBlank()) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "message", "Username or email is required"));
        }
        Map<String, Object> response = authService.forgotPassword(identifier.trim());
        response.put("success", true);
        return ResponseEntity.ok(response);
    }

    // ── Step 2: Verify reset OTP ──────────────────────────────────────────────
    @PostMapping("/verify-reset-otp")
    public ResponseEntity<Map<String, Object>> verifyResetOtp(@RequestBody Map<String, String> req) {
        Map<String, Object> response = authService.verifyResetOtp(
                req.get("username"),
                req.get("otp")
        );
        response.put("success", true);
        return ResponseEntity.ok(response);
    }

    // ── Step 3: Set new password ──────────────────────────────────────────────
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, String> req) {
        Map<String, Object> response = authService.resetPassword(
                req.get("username"),
                req.get("newPassword"),
                req.get("resetToken")
        );
        response.put("success", true);
        return ResponseEntity.ok(response);
    }

}