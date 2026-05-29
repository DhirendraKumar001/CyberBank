package com.cyberbank.service;

import com.cyberbank.entity.BankAccount;
import com.cyberbank.entity.User;
import com.cyberbank.enums.AccountType;
import com.cyberbank.exception.CyberBankException;
import com.cyberbank.repository.BankAccountRepository;
import com.cyberbank.util.AccountNumberGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final BankAccountRepository bankAccountRepository;
    private final AuditService auditService;

    @Transactional
    public BankAccount createAccount(User user, AccountType accountType) {
        BankAccount account = BankAccount.builder()
                .user(user)
                .accountNumber(AccountNumberGenerator.generate())
                .accountType(accountType)
                .build();
        account = bankAccountRepository.save(account);
        auditService.log(user, "ACCOUNT_CREATED", "BankAccount", account.getId(),
                "Created " + accountType + " account");
        return account;
    }

    public List<BankAccount> getUserAccounts(Long userId) {
        return bankAccountRepository.findByUserId(userId);
    }

    public BankAccount getAccount(Long accountId, User user) {
        BankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> new CyberBankException("Account not found"));
        if (!account.getUser().getId().equals(user.getId())) {
            throw new CyberBankException("Access denied");
        }
        return account;
    }

    public BankAccount getAccountByNumber(String accountNumber) {
        return bankAccountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new CyberBankException("Account not found"));
    }
}
