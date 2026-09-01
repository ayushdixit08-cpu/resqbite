package com.resqbite.repository;

import com.resqbite.entity.Ngo;
import com.resqbite.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NgoRepository extends JpaRepository<Ngo, Long> {
    Optional<Ngo> findByUser(User user);
    List<Ngo> findAllByUserRole(User.UserType role);
}
