package com.cyberbank.controller;

import com.cyberbank.entity.Transaction;
import com.cyberbank.entity.User;
import com.cyberbank.exception.CyberBankException;
import com.cyberbank.service.OtpService;
import com.cyberbank.service.TransactionService;
import com.cyberbank.enums.OtpType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;
    private final OtpService otpService;

    @PostMapping("/request-otp")
    public ResponseEntity<Map<String, Object>> requestTransactionOtp(
            @AuthenticationPrincipal User user) {
        otpService.generateAndSendOtp(user, OtpType.TRANSACTION);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "OTP sent to " + maskEmail(user.getEmail())
        ));
    }

    @PostMapping("/credit")
    public ResponseEntity<Transaction> credit(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> req) {
        return ResponseEntity.ok(transactionService.credit(
                user,
                parseLong(req, "accountId"),
                parseBigDecimal(req, "amount"),
                (String) req.get("description"),
                (String) req.get("otp")
        ));
    }

    @PostMapping("/debit")
    public ResponseEntity<Transaction> debit(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> req) {
        return ResponseEntity.ok(transactionService.debit(
                user,
                parseLong(req, "accountId"),
                parseBigDecimal(req, "amount"),
                (String) req.get("description"),
                (String) req.get("otp")
        ));
    }

    @PostMapping("/withdraw")
    public ResponseEntity<Transaction> withdraw(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> req) {
        return ResponseEntity.ok(transactionService.withdraw(
                user,
                parseLong(req, "accountId"),
                parseBigDecimal(req, "amount"),
                (String) req.get("description"),
                (String) req.get("otp")
        ));
    }

    @PostMapping("/transfer")
    public ResponseEntity<Transaction> transfer(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> req) {
        return ResponseEntity.ok(transactionService.transfer(
                user,
                parseLong(req, "fromAccountId"),
                (String) req.get("toAccountNumber"),
                parseBigDecimal(req, "amount"),
                (String) req.get("description"),
                (String) req.get("otp")
        ));
    }

    // ── History — returns empty list instead of 500 when accountId is bad ────
    @GetMapping("/history/{accountId}")
    public ResponseEntity<List<Map<String,Object>>> history(
            @PathVariable String accountId,           // String first — validate manually
            @AuthenticationPrincipal User user) {

        // Guard: reject "undefined", "null", non-numeric values
        if (accountId == null
                || accountId.isBlank()
                || accountId.equals("undefined")
                || accountId.equals("null")) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        long id;
        try {
            id = Long.parseLong(accountId);
        } catch (NumberFormatException e) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<Transaction> txns = transactionService.getTransactionHistory(id, user);
        return ResponseEntity.ok(txns.stream().map(tx -> {
            java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
            m.put("id",              tx.getId());
            m.put("transactionId",   tx.getTransactionId());
            m.put("amount",          tx.getAmount());
            m.put("transactionType", tx.getTransactionType());
            m.put("status",          tx.getStatus());
            m.put("description",     tx.getDescription());
            m.put("balanceAfter",    tx.getBalanceAfter());
            m.put("createdAt",       tx.getCreatedAt() != null ? tx.getCreatedAt().toString() : null);
            // include account numbers safely
            m.put("fromAccountNumber", tx.getFromAccount() != null ? tx.getFromAccount().getAccountNumber() : null);
            m.put("toAccountNumber",   tx.getToAccount()   != null ? tx.getToAccount().getAccountNumber()   : null);
            return m;
        }).collect(java.util.stream.Collectors.toList()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private Long parseLong(Map<String, Object> req, String key) {
        Object val = req.get(key);
        if (val == null) throw new CyberBankException("Missing field: " + key);
        try {
            return Long.parseLong(val.toString());
        } catch (NumberFormatException e) {
            throw new CyberBankException("Invalid value for " + key + ": " + val);
        }
    }

    private BigDecimal parseBigDecimal(Map<String, Object> req, String key) {
        Object val = req.get(key);
        if (val == null) throw new CyberBankException("Missing field: " + key);
        try {
            return new BigDecimal(val.toString());
        } catch (NumberFormatException e) {
            throw new CyberBankException("Invalid amount for " + key + ": " + val);
        }
    }

    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 2) return email;
        return email.charAt(0) + "***" + email.substring(at);
    }
}
