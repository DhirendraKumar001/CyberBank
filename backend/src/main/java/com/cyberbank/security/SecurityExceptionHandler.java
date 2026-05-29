package com.cyberbank.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@Slf4j
public class SecurityExceptionHandler
        implements AccessDeniedHandler, AuthenticationEntryPoint {

    private final ObjectMapper mapper = new ObjectMapper();

    /** Called when user IS authenticated but lacks the required role → 403 */
    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException ex) throws IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String authorities = auth != null
                ? auth.getAuthorities().stream()
                        .map(a -> a.getAuthority())
                        .collect(Collectors.joining(", "))
                : "none";

        log.warn("ACCESS DENIED | URL: {} | User: {} | Authorities: [{}] | Reason: {}",
                request.getRequestURI(),
                auth != null ? auth.getName() : "unknown",
                authorities,
                ex.getMessage());

        Map<String, Object> body = new HashMap<>();
        body.put("status", 403);
        body.put("error", "Forbidden");
        body.put("message", "Access denied — insufficient permissions");
        body.put("path", request.getRequestURI());
        body.put("yourAuthorities", authorities);
        body.put("requiredAuthority", "ROLE_ADMIN");
        body.put("hint", "Make sure the logged-in user has role=ADMIN in the database");

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        mapper.writeValue(response.getOutputStream(), body);
    }

    /** Called when user is NOT authenticated at all → 401 */
    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException ex) throws IOException {

        log.warn("UNAUTHORIZED | URL: {} | Reason: {}",
                request.getRequestURI(), ex.getMessage());

        Map<String, Object> body = new HashMap<>();
        body.put("status", 401);
        body.put("error", "Unauthorized");
        body.put("message", "No valid JWT token — please login first");
        body.put("path", request.getRequestURI());

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        mapper.writeValue(response.getOutputStream(), body);
    }
}
