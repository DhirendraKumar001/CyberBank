package com.cyberbank.config;

import com.cyberbank.security.JwtAuthenticationFilter;
import com.cyberbank.security.SecurityExceptionHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final AuthenticationProvider authenticationProvider;
    private final SecurityExceptionHandler securityExceptionHandler;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    public SecurityConfig(AuthenticationProvider authenticationProvider,
                          SecurityExceptionHandler securityExceptionHandler) {
        this.authenticationProvider     = authenticationProvider;
        this.securityExceptionHandler   = securityExceptionHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                    JwtAuthenticationFilter jwtAuthFilter)
            throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                // ── CORS preflight — always allow ─────────────────────────────
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // ── Public endpoints ──────────────────────────────────────────
                .requestMatchers("/auth/**", "/actuator/health").permitAll()
                // ── Debug (any authenticated user) ────────────────────────────
                .requestMatchers("/debug/**").authenticated()
                // ── Admin only ────────────────────────────────────────────────
                .requestMatchers("/admin/**").hasAuthority("ROLE_ADMIN")
                // ── Everything else needs a valid JWT ─────────────────────────
                .anyRequest().authenticated()
            )
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            // ── Wire custom 401 / 403 handlers ───────────────────────────────
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(securityExceptionHandler)   // 401
                .accessDeniedHandler(securityExceptionHandler)         // 403
            )
            .authenticationProvider(authenticationProvider)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        cfg.setAllowedMethods(Arrays.asList(
                "GET","POST","PUT","DELETE","PATCH","OPTIONS","HEAD"));
        cfg.setAllowedHeaders(Arrays.asList(
                "Authorization","Content-Type","Accept","Origin",
                "X-Requested-With","Access-Control-Request-Method",
                "Access-Control-Request-Headers"));
        cfg.setExposedHeaders(List.of("Authorization","Content-Disposition"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
