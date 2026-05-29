package com.cyberbank.dto;

import com.cyberbank.enums.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

// ── Auth DTOs ──────────────────────────────────────────────────────

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class LoginRequest {
    @NotBlank public String username;
    @NotBlank public String password;
}

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class OtpVerifyRequest {
    @NotBlank public String username;
    @NotBlank @Size(min = 6, max = 6) public String otp;
    public OtpType otpType;
}

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class AuthResponse {
    public String token;
    public String refreshToken;
    public String username;
    public String email;
    public String fullName;
    public Role role;
    public boolean twoFactorRequired;
    public String message;
}

// ── Account DTOs ──────────────────────────────────────────────────

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class CreateAccountRequest {
    @NotNull public AccountType accountType;
}

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class AccountResponse {
    public Long id;
    public String accountNumber;
    public AccountType accountType;
    public BigDecimal balance;
    public String ifscCode;
    public boolean isActive;
    public LocalDateTime createdAt;
}

// ── Transaction DTOs ──────────────────────────────────────────────

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class TransactionRequest {
    @NotNull public Long accountId;
    @NotNull @DecimalMin("1.00") public BigDecimal amount;
    public String description;
    public String otp;
    public String toAccountNumber; // for transfers
}

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class TransactionResponse {
    public String transactionId;
    public BigDecimal amount;
    public TransactionType transactionType;
    public TransactionStatus status;
    public String description;
    public BigDecimal balanceAfter;
    public LocalDateTime createdAt;
    public String fromAccountNumber;
    public String toAccountNumber;
}

// ── Loan DTOs ──────────────────────────────────────────────────────

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class LoanApplicationRequest {
    @NotNull public Long accountId;
    @NotNull public LoanType loanType;
    @NotNull @DecimalMin("10000.00") public BigDecimal principalAmount;
    @NotNull @Min(6) @Max(360) public Integer tenureMonths;
    @NotBlank @Size(min = 12, max = 12) public String aadhaarNumber;
    @NotBlank @Size(min = 10, max = 10) public String panNumber;
    public String otp;
}

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class LoanResponse {
    public String loanId;
    public LoanType loanType;
    public BigDecimal principalAmount;
    public BigDecimal interestRate;
    public Integer tenureMonths;
    public BigDecimal emiAmount;
    public BigDecimal outstandingAmount;
    public LoanStatus status;
    public LocalDateTime appliedAt;
    public LocalDateTime approvedAt;
}

// ── KYC DTOs ──────────────────────────────────────────────────────

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class KycRequest {
    @NotBlank @Size(min = 12, max = 12) public String aadhaarNumber;
    @NotBlank @Size(min = 10, max = 10) public String panNumber;
}

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class KycResponse {
    public Long id;
    public String aadhaarNumber;
    public String panNumber;
    public KycStatus kycStatus;
    public LocalDateTime createdAt;
}

// ── Dashboard ──────────────────────────────────────────────────────

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class DashboardResponse {
    public String fullName;
    public String email;
    public List<AccountResponse> accounts;
    public List<TransactionResponse> recentTransactions;
    public List<LoanResponse> loans;
    public BigDecimal totalBalance;
}

// ── Admin DTOs ────────────────────────────────────────────────────

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class UserSummary {
    public Long id;
    public String username;
    public String email;
    public String fullName;
    public String phone;
    public Role role;
    public boolean isActive;
    public LocalDateTime createdAt;
    public int accountCount;
    public BigDecimal totalBalance;
}

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class ApiResponse<T> {
    public boolean success;
    public String message;
    public T data;

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null);
    }
}
