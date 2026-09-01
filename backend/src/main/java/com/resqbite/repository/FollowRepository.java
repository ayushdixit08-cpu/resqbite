package com.resqbite.repository;

import com.resqbite.entity.Follow;
import com.resqbite.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FollowRepository extends JpaRepository<Follow, Long> {
    boolean existsByFollowerAndFollowed(User follower, User followed);
    Optional<Follow> findByFollowerAndFollowed(User follower, User followed);
    List<Follow> findByFollowerId(Long followerId);
    List<Follow> findByFollowedId(Long followedId);
}
