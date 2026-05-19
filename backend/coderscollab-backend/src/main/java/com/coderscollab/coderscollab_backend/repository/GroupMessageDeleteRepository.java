/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */

/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.repository;

import com.coderscollab.coderscollab_backend.entity.GroupMessageDelete;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupMessageDeleteRepository
        extends JpaRepository<GroupMessageDelete, Long> {

    boolean existsByMessageIdAndUserId(
        Long messageId, Long userId);
}
