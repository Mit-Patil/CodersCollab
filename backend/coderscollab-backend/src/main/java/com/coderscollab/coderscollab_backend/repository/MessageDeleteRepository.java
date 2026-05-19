/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */

/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.repository;

import com.coderscollab.coderscollab_backend.entity.MessageDelete;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface MessageDeleteRepository
        extends JpaRepository<MessageDelete, Long> {

    boolean existsByMessageIdAndUserId(Long messageId, Long userId);

    @Transactional
    void deleteByMessageIdAndUserId(Long messageId, Long userId);
}
