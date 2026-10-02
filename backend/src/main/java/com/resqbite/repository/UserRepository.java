package com.resqbite.repository;

import com.resqbite.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;
import java.util.Collection;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByGoogleId(String googleId);
    long countByRole(User.UserType role);
    long countByRoleIn(Collection<User.UserType> roles);
    List<User> findByRole(User.UserType role);
    List<User> findByRoleIn(Collection<User.UserType> roles);
    List<User> findTop5ByRoleOrderByIdAsc(User.UserType role);
    List<User> findTop5ByRoleInOrderByIdAsc(Collection<User.UserType> roles);
    Optional<User> findFirstByRole(User.UserType role);
    Optional<User> findFirstByRoleIn(Collection<User.UserType> roles);
}
