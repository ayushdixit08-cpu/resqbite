package com.resqbite.repository;

import com.resqbite.entity.User;
import com.resqbite.entity.Volunteer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VolunteerRepository extends JpaRepository<Volunteer, Long> {
    Optional<Volunteer> findByUser(User user);
    List<Volunteer> findAllByUserRole(User.UserType role);
}
