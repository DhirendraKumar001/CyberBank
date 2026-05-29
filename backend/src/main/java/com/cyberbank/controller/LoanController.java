package com.cyberbank.controller;

import com.cyberbank.entity.Loan;
import com.cyberbank.entity.User;
import com.cyberbank.enums.LoanType;
import com.cyberbank.enums.OtpType;
import com.cyberbank.service.LoanService;
import com.cyberbank.service.OtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/loans")
@RequiredArgsConstructor
public class LoanController {

    private final LoanService loanService;
    private final OtpService otpService;

    @PostMapping("/request-otp")
    public ResponseEntity<Map<String, Object>> requestLoanOtp(@AuthenticationPrincipal User user) {
        otpService.generateAndSendOtp(user, OtpType.LOAN);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "OTP sent for loan application verification"
        ));
    }

    @PostMapping("/apply")
    public ResponseEntity<Loan> applyLoan(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> req) {
        return ResponseEntity.ok(loanService.applyForLoan(
                user,
                Long.parseLong(req.get("accountId").toString()),
                LoanType.valueOf(req.get("loanType").toString()),
                new BigDecimal(req.get("principalAmount").toString()),
                Integer.parseInt(req.get("tenureMonths").toString()),
                (String) req.get("aadhaarNumber"),
                (String) req.get("panNumber"),
                (String) req.get("otp")
        ));
    }

    @GetMapping("/my")
    public ResponseEntity<List<Loan>> myLoans(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(loanService.getUserLoans(user.getId()));
    }

    @GetMapping("/emi-calculator")
    public ResponseEntity<Map<String, Object>> calculateEmi(
            @RequestParam BigDecimal principal,
            @RequestParam String loanType,
            @RequestParam int tenure) {
        // Use approximate rates for calculator
        Map<String, BigDecimal> rates = Map.of(
                "PERSONAL", new BigDecimal("12.0"),
                "HOME", new BigDecimal("8.5"),
                "EDUCATION", new BigDecimal("9.0"),
                "VEHICLE", new BigDecimal("10.5"),
                "BUSINESS", new BigDecimal("14.0")
        );
        BigDecimal rate = rates.getOrDefault(loanType.toUpperCase(), new BigDecimal("12.0"));
        BigDecimal emi = loanService.calculateEmi(principal, rate, tenure);
        BigDecimal total = emi.multiply(new BigDecimal(tenure));
        BigDecimal interest = total.subtract(principal);

        return ResponseEntity.ok(Map.of(
                "emi", emi,
                "totalPayable", total,
                "totalInterest", interest,
                "interestRate", rate
        ));
    }

    // Admin endpoints
    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Loan> approveLoan(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(loanService.approveLoan(id, admin));
    }

    @PutMapping("/{id}/disburse")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Loan> disburseLoan(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(loanService.disburseLoan(id, admin));
    }
}
