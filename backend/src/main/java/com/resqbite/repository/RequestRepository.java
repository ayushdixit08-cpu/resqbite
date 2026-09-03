package com.resqbite.repository;

import com.resqbite.entity.Request;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RequestRepository extends JpaRepository<Request, Long> {
    List<Request> findBySenderId(Long senderId);
    List<Request> findByRecipientId(Long recipientId);
    List<Request> findByRecipientIdAndStatus(Long recipientId, Request.RequestStatus status);
    List<Request> findBySenderIdAndRecipientId(Long senderId, Long recipientId);
    List<Request> findBySenderIdAndTypeOrderByCreatedAtDesc(Long senderId, Request.RequestType type);
    List<Request> findByTypeOrderByCreatedAtDesc(Request.RequestType type);
    List<Request> findByTypeAndStatusInOrderByCreatedAtDesc(Request.RequestType type, List<Request.RequestStatus> statuses);
    long countBySenderIdAndType(Long senderId, Request.RequestType type);
    long countBySenderIdAndTypeAndStatusNotIn(Long senderId, Request.RequestType type, List<Request.RequestStatus> statuses);
    long countBySenderIdAndTypeAndStatus(Long senderId, Request.RequestType type, Request.RequestStatus status);
}
