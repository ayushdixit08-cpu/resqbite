package com.resqbite.repository;

import com.resqbite.entity.Opportunity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OpportunityRepository extends JpaRepository<Opportunity, Long> {
    List<Opportunity> findByNgoIdOrderByCreatedAtDesc(Long ngoId);
    List<Opportunity> findAllByOrderByCreatedAtDesc();
}
