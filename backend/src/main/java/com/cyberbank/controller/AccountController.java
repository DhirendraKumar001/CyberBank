package com.cyberbank.controller;

import com.cyberbank.entity.BankAccount;
import com.cyberbank.entity.User;
import com.cyberbank.enums.AccountType;
import com.cyberbank.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getMyAccounts(
            @AuthenticationPrincipal User user) {
        List<BankAccount> accounts = accountService.getUserAccounts(user.getId());
        return ResponseEntity.ok(
                accounts.stream().map(this::toMap).collect(Collectors.toList())
        );
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createAccount(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> req) {
        String typeStr = req.getOrDefault("accountType", "SAVINGS").toUpperCase();
        AccountType type = AccountType.valueOf(typeStr);
        BankAccount account = accountService.createAccount(user, type);
        return ResponseEntity.ok(toMap(account));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getAccount(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(toMap(accountService.getAccount(id, user)));
    }

    @GetMapping("/lookup/{accountNumber}")
    public ResponseEntity<Map<String, Object>> lookupAccount(
            @PathVariable String accountNumber) {
        BankAccount account = accountService.getAccountByNumber(accountNumber);
        // Use HashMap — Map.of() throws NPE on null values
        Map<String, Object> result = new HashMap<>();
        result.put("accountNumber", account.getAccountNumber());
        result.put("holderName",    account.getUser().getFullName());
        result.put("ifscCode",      account.getIfscCode() != null ? account.getIfscCode() : "CYBR0000001");
        return ResponseEntity.ok(result);
    }

    /**
     * Safely serialize BankAccount to Map.
     * Uses HashMap (not Map.of) — Map.of throws NullPointerException on ANY null value,
     * which causes a 500 if createdAt / ifscCode / balance is null in the DB.
     */
    private Map<String, Object> toMap(BankAccount a) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",            a.getId());
        m.put("accountNumber", a.getAccountNumber() != null ? a.getAccountNumber() : "");
        m.put("accountType",   a.getAccountType() != null ? a.getAccountType().name() : "SAVINGS");
        m.put("balance",       a.getBalance() != null ? a.getBalance() : BigDecimal.ZERO);
        m.put("ifscCode",      a.getIfscCode() != null ? a.getIfscCode() : "CYBR0000001");
        m.put("isActive",      Boolean.TRUE.equals(a.getIsActive()));
        m.put("createdAt",     a.getCreatedAt() != null ? a.getCreatedAt().toString() : "");
        return m;
    }
}
