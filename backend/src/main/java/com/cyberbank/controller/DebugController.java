package com.cyberbank.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Temporary debug endpoint — remove before production.
 * Hit GET /api/debug/whoami with your Bearer token to see
 * exactly which username and authorities Spring resolved.
 */
@RestController
@RequestMapping("/debug")
public class DebugController {

    @GetMapping("/whoami")
    public ResponseEntity<Map<String, Object>> whoami() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        Map<String, Object> info = new HashMap<>();

        if (auth == null) {
            info.put("authenticated", false);
            info.put("reason", "No Authentication object in SecurityContext — JWT missing or invalid");
            return ResponseEntity.status(401).body(info);
        }

        List<String> authorities = auth.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        info.put("authenticated", auth.isAuthenticated());
        info.put("principal", auth.getPrincipal() != null ? auth.getPrincipal().toString() : "null");
        info.put("username", auth.getName());
        info.put("authorities", authorities);
        info.put("hasRoleAdmin",   authorities.contains("ROLE_ADMIN"));
        info.put("requiresForAdmin", "ROLE_ADMIN");
        info.put("verdict", authorities.contains("ROLE_ADMIN")
                ? "PASS — /admin/** should be accessible"
                : "FAIL — missing ROLE_ADMIN, that is why you get 403");

        return ResponseEntity.ok(info);
    }
}
