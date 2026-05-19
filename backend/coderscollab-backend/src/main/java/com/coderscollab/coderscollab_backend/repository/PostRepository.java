/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */



/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.repository;

import com.coderscollab.coderscollab_backend.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {

    List<Post> findAllByOrderByCreatedAtDesc();

    List<Post> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Post> findByVisibilityOrderByCreatedAtDesc(String visibility);

    long countByUserId(Long userId);
}
