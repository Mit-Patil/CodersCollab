/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */



/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.service;

import com.coderscollab.coderscollab_backend.dto.*;
import com.coderscollab.coderscollab_backend.entity.User;
import com.coderscollab.coderscollab_backend.repository.UserRepository;
import com.coderscollab.coderscollab_backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.coderscollab.coderscollab_backend.entity.UserProfile;
import com.coderscollab.coderscollab_backend.repository.UserProfileRepository;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
private final UserProfileRepository userProfileRepository;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already in use");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already taken");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role("USER")
                .isPrivate(false)
                .build();

        userRepository.save(user);

UserProfile profile = UserProfile.builder()
        .user(user)
        .availableForCollab(true)
        .build();
userProfileRepository.save(profile);

        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(user.getId(), token,
            user.getUsername(), user.getEmail(), user.getRole());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() ->
                        new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(user.getId(), token,
            user.getUsername(), user.getEmail(), user.getRole());
    }
}
