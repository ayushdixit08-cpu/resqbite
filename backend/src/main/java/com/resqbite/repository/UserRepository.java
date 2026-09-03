package com.resqbite.repository;

import com.resqbite.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    long countByRole(User.UserType role);
    List<User> findByRole(User.UserType role);
    List<User> findTop5ByRoleOrderByIdAsc(User.UserType role);
    Optional<User> findFirstByRole(User.UserType role);
}
