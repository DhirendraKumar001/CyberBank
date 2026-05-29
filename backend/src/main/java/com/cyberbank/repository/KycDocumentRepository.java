package com.cyberbank.repository;

import com.cyberbank.entity.KycDocument;
import com.cyberbank.enums.KycStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KycDocumentRepository extends JpaRepository<KycDocument, Long> {
    List<KycDocument> findByUserId(Long userId);
    Optional<KycDocument> findByAadhaarNumber(String aadhaarNumber);
    Optional<KycDocument> findByPanNumber(String panNumber);
    Optional<KycDocument> findByUserIdAndKycStatus(Long userId, KycStatus status);
}
