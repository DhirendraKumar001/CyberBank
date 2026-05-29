package com.cyberbank.repository;

import com.cyberbank.entity.OtpRecord;
import com.cyberbank.enums.OtpType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface OtpRepository extends JpaRepository<OtpRecord, Long> {

    @Query("SELECT o FROM OtpRecord o WHERE o.user.id = :userId AND o.otpType = :type AND o.isUsed = false ORDER BY o.createdAt DESC LIMIT 1")
    Optional<OtpRecord> findLatestValidOtp(@Param("userId") Long userId, @Param("type") OtpType type);

    @Modifying
    @Transactional
    @Query("UPDATE OtpRecord o SET o.isUsed = true WHERE o.user.id = :userId AND o.otpType = :type")
    void invalidateAllOtps(@Param("userId") Long userId, @Param("type") OtpType type);
}
