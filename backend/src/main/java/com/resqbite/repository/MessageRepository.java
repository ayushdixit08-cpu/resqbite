package com.resqbite.repository;

import com.resqbite.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByConnectionIdOrderByCreatedAtAsc(Long connectionId);
    List<Message> findBySenderIdOrRecipientIdOrderByCreatedAtAsc(Long senderId, Long recipientId);
}
