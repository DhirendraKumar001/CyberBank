package com.cyberbank.dto;

import com.cyberbank.enums.OtpType;
import jakarta.validation.constraints.*;
import lombok.Data;

// ─── Request DTOs ────────────────────────────────────────────────

@Data
class RegisterRequest {
    @NotBlank @Size(min = 3, max = 50)
    public String username;
    @NotBlank @Email
    public String email;
    @NotBlank @Size(min = 8)
    public String password;
    @NotBlank
    public String fullName;
    @NotBlank @Pattern(regexp = "^[6-9]\\d{9}$")
    public String phone;
}
