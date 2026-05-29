package com.cyberbank.controller;

import com.cyberbank.entity.*;
import com.cyberbank.enums.KycStatus;
import com.cyberbank.repository.*;
import com.cyberbank.service.LoanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final BankAccountRepository bankAccountRepository;
    private final TransactionRepository transactionRepository;
    private final LoanRepository loanRepository;
    private final KycDocumentRepository kycDocumentRepository;
    private final AuditLogRepository auditLogRepository;
    private final LoanService loanService;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard() {
        long totalUsers = userRepository.count();
        long totalAccounts = bankAccountRepository.count();
        long totalTransactions = transactionRepository.count();
        long pendingLoans = loanRepository.findAll().stream()
                .filter(l -> l.getStatus().name().equals("APPLIED")).count();
        long pendingKyc = kycDocumentRepository.findAll().stream()
                .filter(k -> k.getKycStatus() == KycStatus.PENDING).count();

        BigDecimal totalBalance = bankAccountRepository.findAll().stream()
                .map(BankAccount::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ResponseEntity.ok(Map.of(
                "totalUsers", totalUsers,
                "totalAccounts", totalAccounts,
                "totalTransactions", totalTransactions,
                "pendingLoans", pendingLoans,
                "pendingKyc", pendingKyc,
                "totalBalance", totalBalance
        ));
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll().stream().map(u -> {
            List<BankAccount> accounts = bankAccountRepository.findByUserId(u.getId());
            BigDecimal totalBal = accounts.stream()
                    .map(BankAccount::getBalance)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            return Map.<String, Object>of(
                    "id", u.getId(),
                    "username", u.getUsername(),
                    "email", u.getEmail(),
                    "fullName", u.getFullName(),
                    "phone", u.getPhone(),
                    "role", u.getRole(),
                    "isActive", u.getIsActive(),
                    "accountCount", accounts.size(),
                    "totalBalance", totalBal,
                    "createdAt", u.getCreatedAt()
            );
        }).collect(Collectors.toList()));
    }

    @PutMapping("/users/{id}/toggle-status")
    public ResponseEntity<Map<String, Object>> toggleUserStatus(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsActive(!user.getIsActive());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User status updated",
                "isActive", user.getIsActive()
        ));
    }

    @GetMapping("/loans")
    public ResponseEntity<List<Loan>> getAllLoans() {
        return ResponseEntity.ok(loanService.getAllLoans());
    }

    @PutMapping("/loans/{id}/approve")
    public ResponseEntity<Loan> approveLoan(@PathVariable Long id, @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(loanService.approveLoan(id, admin));
    }

    @PutMapping("/loans/{id}/disburse")
    public ResponseEntity<Loan> disburseLoan(@PathVariable Long id, @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(loanService.disburseLoan(id, admin));
    }

    @GetMapping("/kyc/pending")
    public ResponseEntity<List<KycDocument>> getPendingKyc() {
        return ResponseEntity.ok(kycDocumentRepository.findAll().stream()
                .filter(k -> k.getKycStatus() == KycStatus.PENDING)
                .collect(Collectors.toList()));
    }

    @PutMapping("/kyc/{id}/verify")
    public ResponseEntity<Map<String, Object>> verifyKyc(@PathVariable Long id) {
        KycDocument kyc = kycDocumentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("KYC not found"));
        kyc.setKycStatus(KycStatus.VERIFIED);
        kyc.setVerifiedAt(LocalDateTime.now());
        kycDocumentRepository.save(kyc);
        return ResponseEntity.ok(Map.of("success", true, "message", "KYC verified"));
    }

    @PutMapping("/kyc/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectKyc(@PathVariable Long id) {
        KycDocument kyc = kycDocumentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("KYC not found"));
        kyc.setKycStatus(KycStatus.REJECTED);
        kycDocumentRepository.save(kyc);
        return ResponseEntity.ok(Map.of("success", true, "message", "KYC rejected"));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<Transaction>> getAllTransactions() {
        return ResponseEntity.ok(transactionRepository.findAll());
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(auditLogRepository.findAll());
    }

    @GetMapping("/vendors")
    public ResponseEntity<List<Map<String, Object>>> getVendors() {
        return ResponseEntity.ok(userRepository.findAll().stream()
                .filter(u -> u.getRole().name().equals("USER"))
                .map(u -> {
                    List<BankAccount> accounts = bankAccountRepository.findByUserId(u.getId());
                    BigDecimal totalBal = accounts.stream()
                            .map(BankAccount::getBalance)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    java.util.Map<String, Object> vm = new java.util.HashMap<>();
                    vm.put("id",           u.getId());
                    vm.put("username",     u.getUsername() != null ? u.getUsername() : "");
                    vm.put("email",        u.getEmail() != null ? u.getEmail() : "");
                    vm.put("fullName",     u.getFullName() != null ? u.getFullName() : "");
                    vm.put("phone",        u.getPhone() != null ? u.getPhone() : "");
                    vm.put("isActive",     Boolean.TRUE.equals(u.getIsActive()));
                    vm.put("accountCount", accounts.size());
                    vm.put("totalBalance", totalBal);
                    return vm;
                })
                .collect(Collectors.toList()));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        long totalUsers        = userRepository.count();
        long activeUsers       = userRepository.findAll().stream().filter(u -> Boolean.TRUE.equals(u.getIsActive())).count();
        long totalAccounts     = bankAccountRepository.count();
        long totalTransactions = transactionRepository.count();
        long pendingLoans      = loanRepository.findAll().stream().filter(l -> l.getStatus().name().equals("APPLIED")).count();
        long pendingKyc        = kycDocumentRepository.findAll().stream().filter(k -> k.getKycStatus() == KycStatus.PENDING).count();
        BigDecimal totalBalance = bankAccountRepository.findAll().stream().map(BankAccount::getBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
        return ResponseEntity.ok(Map.<String, Object>of(
                "totalUsers", totalUsers, "activeUsers", activeUsers,
                "totalAccounts", totalAccounts, "totalTransactions", totalTransactions,
                "pendingLoans", pendingLoans, "pendingKyc", pendingKyc,
                "totalBalance", totalBalance));
    }
}
