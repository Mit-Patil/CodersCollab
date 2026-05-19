/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */



/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.config;

import com.coderscollab.coderscollab_backend.filter.JwtFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.*;
import org.springframework.security.config.annotation.authentication.configuration.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.util.Arrays;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig implements WebMvcConfigurer {

    private final JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
           .authorizeHttpRequests(auth -> auth
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
    .requestMatchers("/api/auth/**").permitAll()
    .requestMatchers("/uploads/**").permitAll()
    .requestMatchers(HttpMethod.GET, "/api/follow/**").permitAll()
    .requestMatchers(HttpMethod.GET, "/api/profile/explore").authenticated()
    .requestMatchers(HttpMethod.GET, "/api/posts").permitAll()
    .requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()
    .requestMatchers(HttpMethod.GET, "/api/posts/*/comments").permitAll()
    .requestMatchers(HttpMethod.GET, "/api/profile/*").permitAll()
    .requestMatchers(HttpMethod.GET, "/api/posts/user/*").permitAll()
    .requestMatchers(HttpMethod.GET, "/api/posts/*/like/status").authenticated()
    .requestMatchers(HttpMethod.POST, "/api/posts").authenticated()
    .requestMatchers(HttpMethod.POST, "/api/posts/image").authenticated()
    .requestMatchers(HttpMethod.PUT, "/api/posts/**").authenticated()
    .requestMatchers(HttpMethod.DELETE, "/api/posts/**").authenticated()
    .requestMatchers("/api/groups/**").authenticated()
    .requestMatchers(HttpMethod.GET, "/api/posts/*").permitAll()
    .requestMatchers("/uploads/chat-media/**").permitAll()
    .requestMatchers("/api/messages/**").authenticated()
    .requestMatchers("/ws/**").permitAll()
    .anyRequest().authenticated()
)
            .addFilterBefore(jwtFilter,
                UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("http://localhost:3000"));
    config.setAllowedMethods(List.of("GET","POST","PUT",
            "DELETE","OPTIONS","PATCH"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    config.setExposedHeaders(List.of("Authorization"));

    UrlBasedCorsConfigurationSource source =
            new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
        .addResourceLocations(
            "file:D:/CodersCollab/backend/coderscollab-backend/uploads/");
    }
}