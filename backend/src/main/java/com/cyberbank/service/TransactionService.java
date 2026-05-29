package com.cyberbank.service;

import com.cyberbank.entity.BankAccount;
import com.cyberbank.entity.Transaction;
import com.cyberbank.entity.User;
import com.cyberbank.enums.OtpType;
import com.cyberbank.enums.TransactionStatus;
import com.cyberbank.enums.TransactionType;
import com.cyberbank.exception.CyberBankException;
import com.cyberbank.repository.BankAccountRepository;
import com.cyberbank.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final BankAccountRepository bankAccountRepository;
    private final OtpService otpService;
    private final AuditService auditService;

    @Transactional
    public Transaction credit(User user, Long accountId, BigDecimal amount, String description, String otp) {
        validateOtp(user, otp, OtpType.TRANSACTION);

        BankAccount account = getAccountForUser(accountId, user);
        account.setBalance(account.getBalance().add(amount));
        bankAccountRepository.save(account);

        Transaction tx = createTransaction(null, account, amount, TransactionType.CREDIT, description, account.getBalance());
        auditService.log(user, "CREDIT", "Transaction", tx.getId(), "Credit ₹" + amount);
        return tx;
    }

    @Transactional
    public Transaction debit(User user, Long accountId, BigDecimal amount, String description, String otp) {
        validateOtp(user, otp, OtpType.TRANSACTION);

        BankAccount account = getAccountForUser(accountId, user);
        checkSufficientBalance(account, amount);

        account.setBalance(account.getBalance().subtract(amount));
        bankAccountRepository.save(account);

        Transaction tx = createTransaction(account, null, amount, TransactionType.DEBIT, description, account.getBalance());
        auditService.log(user, "DEBIT", "Transaction", tx.getId(), "Debit ₹" + amount);
        return tx;
    }

    @Transactional
    public Transaction withdraw(User user, Long accountId, BigDecimal amount, String description, String otp) {
        validateOtp(user, otp, OtpType.TRANSACTION);

        BankAccount account = getAccountForUser(accountId, user);
        checkSufficientBalance(account, amount);

        account.setBalance(account.getBalance().subtract(amount));
        bankAccountRepository.save(account);

        Transaction tx = createTransaction(account, null, amount, TransactionType.WITHDRAWAL, description, account.getBalance());
        auditService.log(user, "WITHDRAWAL", "Transaction", tx.getId(), "Withdrawal ₹" + amount);
        return tx;
    }

    @Transactional
    public Transaction transfer(User user, Long fromAccountId, String toAccountNumber,
                                 BigDecimal amount, String description, String otp) {
        validateOtp(user, otp, OtpType.TRANSACTION);

        BankAccount fromAccount = getAccountForUser(fromAccountId, user);
        BankAccount toAccount = bankAccountRepository.findByAccountNumber(toAccountNumber)
                .orElseThrow(() -> new CyberBankException("Destination account not found: " + toAccountNumber));

        if (fromAccount.getAccountNumber().equals(toAccountNumber)) {
            throw new CyberBankException("Cannot transfer to the same account");
        }

        checkSufficientBalance(fromAccount, amount);

        fromAccount.setBalance(fromAccount.getBalance().subtract(amount));
        toAccount.setBalance(toAccount.getBalance().add(amount));

        bankAccountRepository.save(fromAccount);
        bankAccountRepository.save(toAccount);

        Transaction tx = createTransaction(fromAccount, toAccount, amount, TransactionType.TRANSFER, description, fromAccount.getBalance());
        auditService.log(user, "TRANSFER", "Transaction", tx.getId(),
                "Transfer ₹" + amount + " to " + toAccountNumber);
        return tx;
    }

    public List<Transaction> getTransactionHistory(Long accountId, User user) {
        // Verify account belongs to user or user is admin
        BankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> new CyberBankException("Account not found"));

        if (!account.getUser().getId().equals(user.getId())) {
            throw new CyberBankException("Access denied");
        }

        return transactionRepository.findByAccountId(accountId, PageRequest.of(0, 50)).getContent();
    }

    private void validateOtp(User user, String otp, OtpType otpType) {
        if (otp == null || otp.isBlank()) {
            // Generate OTP and ask for it
            otpService.generateAndSendOtp(user, otpType);
            throw new CyberBankException("OTP_REQUIRED:OTP sent to " + user.getEmail());
        }
        if (!otpService.validateOtp(user, otp, otpType)) {
            throw new CyberBankException("Invalid or expired OTP");
        }
    }

    private BankAccount getAccountForUser(Long accountId, User user) {
        BankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> new CyberBankException("Account not found"));
        if (!account.getUser().getId().equals(user.getId())) {
            throw new CyberBankException("Access denied to this account");
        }
        if (!account.getIsActive()) {
            throw new CyberBankException("Account is inactive");
        }
        return account;
    }

    private void checkSufficientBalance(BankAccount account, BigDecimal amount) {
        if (account.getBalance().compareTo(amount) < 0) {
            throw new CyberBankException("Insufficient balance. Available: ₹" + account.getBalance());
        }
    }

    private Transaction createTransaction(BankAccount from, BankAccount to, BigDecimal amount,
                                           TransactionType type, String description, BigDecimal balanceAfter) {
        Transaction tx = Transaction.builder()
                .transactionId("TXN" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase())
                .fromAccount(from)
                .toAccount(to)
                .amount(amount)
                .transactionType(type)
                .status(TransactionStatus.SUCCESS)
                .description(description)
                .balanceAfter(balanceAfter)
                .build();
        return transactionRepository.save(tx);
    }
}
