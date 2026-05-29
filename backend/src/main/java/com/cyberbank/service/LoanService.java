package com.cyberbank.service;

import com.cyberbank.entity.*;
import com.cyberbank.enums.*;
import com.cyberbank.exception.CyberBankException;
import com.cyberbank.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoanService {

    private final LoanRepository loanRepository;
    private final BankAccountRepository bankAccountRepository;
    private final KycDocumentRepository kycDocumentRepository;
    private final TransactionRepository transactionRepository;
    private final OtpService otpService;
    private final AuditService auditService;

    // Interest rates by loan type (annual %)
    private static final java.util.Map<LoanType, BigDecimal> INTEREST_RATES = java.util.Map.of(
            LoanType.PERSONAL, new BigDecimal("12.0"),
            LoanType.HOME, new BigDecimal("8.5"),
            LoanType.EDUCATION, new BigDecimal("9.0"),
            LoanType.VEHICLE, new BigDecimal("10.5"),
            LoanType.BUSINESS, new BigDecimal("14.0")
    );

    @Transactional
    public Loan applyForLoan(User user, Long accountId, LoanType loanType,
                              BigDecimal principalAmount, Integer tenureMonths,
                              String aadhaarNumber, String panNumber, String otp) {

        // Validate OTP
        if (!otpService.validateOtp(user, otp, OtpType.LOAN)) {
            throw new CyberBankException("Invalid or expired OTP for loan application");
        }

        BankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> new CyberBankException("Account not found"));

        if (!account.getUser().getId().equals(user.getId())) {
            throw new CyberBankException("Access denied");
        }

        // Validate / save KYC
        KycDocument kyc = processKyc(user, aadhaarNumber, panNumber);

        BigDecimal interestRate = INTEREST_RATES.get(loanType);
        BigDecimal emiAmount = calculateEmi(principalAmount, interestRate, tenureMonths);

        Loan loan = Loan.builder()
                .loanId("LN" + UUID.randomUUID().toString().replace("-", "").substring(0, 14).toUpperCase())
                .user(user)
                .account(account)
                .loanType(loanType)
                .principalAmount(principalAmount)
                .interestRate(interestRate)
                .tenureMonths(tenureMonths)
                .emiAmount(emiAmount)
                .outstandingAmount(calculateTotalPayable(principalAmount, interestRate, tenureMonths))
                .status(LoanStatus.APPLIED)
                .kycDocument(kyc)
                .build();

        loan = loanRepository.save(loan);
        auditService.log(user, "LOAN_APPLIED", "Loan", loan.getId(),
                "Loan applied for ₹" + principalAmount + " type: " + loanType);

        return loan;
    }

    @Transactional
    public Loan approveLoan(Long loanId, User adminUser) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new CyberBankException("Loan not found"));

        if (loan.getStatus() != LoanStatus.APPLIED && loan.getStatus() != LoanStatus.UNDER_REVIEW) {
            throw new CyberBankException("Loan cannot be approved in current status: " + loan.getStatus());
        }

        loan.setStatus(LoanStatus.APPROVED);
        loan.setApprovedAt(LocalDateTime.now());
        loanRepository.save(loan);

        auditService.log(adminUser, "LOAN_APPROVED", "Loan", loan.getId(), "Loan approved by admin");
        return loan;
    }

    @Transactional
    public Loan disburseLoan(Long loanId, User adminUser) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new CyberBankException("Loan not found"));

        if (loan.getStatus() != LoanStatus.APPROVED) {
            throw new CyberBankException("Loan must be approved before disbursement");
        }

        // Credit loan amount to account
        BankAccount account = loan.getAccount();
        account.setBalance(account.getBalance().add(loan.getPrincipalAmount()));
        bankAccountRepository.save(account);

        // Create disbursement transaction
        Transaction tx = Transaction.builder()
                .transactionId("TXN" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase())
                .toAccount(account)
                .amount(loan.getPrincipalAmount())
                .transactionType(TransactionType.LOAN_DISBURSEMENT)
                .status(TransactionStatus.SUCCESS)
                .description("Loan disbursement - " + loan.getLoanId())
                .balanceAfter(account.getBalance())
                .build();
        transactionRepository.save(tx);

        loan.setStatus(LoanStatus.DISBURSED);
        loan.setDisbursedAt(LocalDateTime.now());
        loanRepository.save(loan);

        auditService.log(adminUser, "LOAN_DISBURSED", "Loan", loan.getId(), "Loan disbursed ₹" + loan.getPrincipalAmount());
        return loan;
    }

    public List<Loan> getUserLoans(Long userId) {
        return loanRepository.findByUserId(userId);
    }

    public List<Loan> getAllLoans() {
        return loanRepository.findAll();
    }

    public void sendLoanOtp(User user) {
        otpService.generateAndSendOtp(user, OtpType.LOAN);
    }

    private KycDocument processKyc(User user, String aadhaarNumber, String panNumber) {
        // Check if KYC already exists
        return kycDocumentRepository.findByUserIdAndKycStatus(user.getId(), KycStatus.VERIFIED)
                .orElseGet(() -> {
                    KycDocument kyc = KycDocument.builder()
                            .user(user)
                            .aadhaarNumber(aadhaarNumber)
                            .panNumber(panNumber)
                            .kycStatus(KycStatus.PENDING)
                            .build();
                    return kycDocumentRepository.save(kyc);
                });
    }

    /**
     * EMI = P × r × (1+r)^n / ((1+r)^n - 1)
     * where r = monthly rate, n = tenure months
     */
    public BigDecimal calculateEmi(BigDecimal principal, BigDecimal annualRate, int months) {
        BigDecimal monthlyRate = annualRate.divide(new BigDecimal("1200"), 10, RoundingMode.HALF_UP);
        BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate);
        BigDecimal onePlusRPowN = onePlusR.pow(months);
        BigDecimal numerator = principal.multiply(monthlyRate).multiply(onePlusRPowN);
        BigDecimal denominator = onePlusRPowN.subtract(BigDecimal.ONE);
        return numerator.divide(denominator, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateTotalPayable(BigDecimal principal, BigDecimal annualRate, int months) {
        return calculateEmi(principal, annualRate, months).multiply(new BigDecimal(months));
    }
}
