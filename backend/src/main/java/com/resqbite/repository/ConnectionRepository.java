package com.resqbite.repository;

import com.resqbite.entity.Connection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConnectionRepository extends JpaRepository<Connection, Long> {
    @Query("SELECT c FROM Connection c WHERE (c.userOne.id = :userId OR c.userTwo.id = :userId)")
    List<Connection> findByUserId(@Param("userId") Long userId);

    @Query("SELECT c FROM Connection c WHERE ((c.userOne.id = :userOneId AND c.userTwo.id = :userTwoId) OR (c.userOne.id = :userTwoId AND c.userTwo.id = :userOneId))")
    Optional<Connection> findBetweenUsers(@Param("userOneId") Long userOneId, @Param("userTwoId") Long userTwoId);
}
