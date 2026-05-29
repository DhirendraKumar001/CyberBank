package com.cyberbank.util;

import java.security.SecureRandom;

public class AccountNumberGenerator {
    private static final SecureRandom random = new SecureRandom();

    public static String generate() {
        // Format: CYBR + 12 digits
        StringBuilder sb = new StringBuilder("CYBR");
        for (int i = 0; i < 12; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }
}
