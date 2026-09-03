package com.resqbite.service;

import com.resqbite.dto.*;
import com.resqbite.entity.*;
import com.resqbite.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ConnectionService {

    private final UserRepository userRepository;
    private final RequestRepository requestRepository;
    private final ConnectionRepository connectionRepository;
    private final FollowRepository followRepository;
    private final MessageRepository messageRepository;
    private final OpportunityRepository opportunityRepository;

    public ConnectionService(UserRepository userRepository,
                            RequestRepository requestRepository,
                            ConnectionRepository connectionRepository,
                            FollowRepository followRepository,
                            MessageRepository messageRepository,
                            OpportunityRepository opportunityRepository) {
        this.userRepository = userRepository;
        this.requestRepository = requestRepository;
        this.connectionRepository = connectionRepository;
        this.followRepository = followRepository;
        this.messageRepository = messageRepository;
        this.opportunityRepository = opportunityRepository;
    }

    @Transactional
    public RequestDto createRequest(Long senderId, CreateRequestRequest request) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Sender not found"));
        User recipient = request.recipientId() == null
                ? userRepository.findAll().stream()
                .filter(user -> user.getRole() == User.UserType.ORGANIZATION)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No recipient organization is available"))
                : userRepository.findById(request.recipientId())
                .orElseThrow(() -> new IllegalArgumentException("Recipient not found"));

        Request.RequestType type = request.type() == null
                ? Request.RequestType.VOLUNTEER_TO_NGO
                : Request.RequestType.valueOf(request.type().toUpperCase());

        Request entity = new Request(sender, recipient, type, request.message(), request.activityTitle());
        return RequestDto.from(requestRepository.save(entity));
    }

    @Transactional
    public RequestDto updateRequestStatus(Long requestId, Long actorId, String rawStatus) {
        Request request = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!request.getRecipient().getId().equals(actor.getId()) && !request.getSender().getId().equals(actor.getId())) {
            throw new IllegalArgumentException("User is not part of this request");
        }

        Request.RequestStatus status = Request.RequestStatus.valueOf(rawStatus.toUpperCase());
        request.setStatus(status);
        request.setUpdatedAt(java.time.Instant.now());
        Request saved = requestRepository.save(request);

        if (status == Request.RequestStatus.ACCEPTED) {
            Optional<Connection> existing = connectionRepository.findBetweenUsers(request.getSender().getId(), request.getRecipient().getId());
            if (existing.isEmpty()) {
                connectionRepository.save(new Connection(request.getSender(), request.getRecipient(), saved));
            }
        }

        return RequestDto.from(saved);
    }

    @Transactional(readOnly = true)
    public List<RequestDto> listRequestsForUser(Long userId) {
        return requestRepository.findBySenderId(userId).stream()
                .map(RequestDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RequestDto> listIncomingRequests(Long userId) {
        return requestRepository.findByRecipientId(userId).stream()
                .map(RequestDto::from)
                .toList();
    }

    @Transactional
    public FollowDto toggleFollow(Long followerId, Long targetUserId) {
        User follower = userRepository.findById(followerId)
                .orElseThrow(() -> new IllegalArgumentException("Follower not found"));
        User followed = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("User to follow not found"));

        Optional<Follow> existing = followRepository.findByFollowerAndFollowed(follower, followed);
        if (existing.isPresent()) {
            followRepository.delete(existing.get());
            return null;
        }

        Follow saved = followRepository.save(new Follow(follower, followed));
        return FollowDto.from(saved);
    }

    @Transactional(readOnly = true)
    public List<FollowDto> getFollowing(Long userId) {
        return followRepository.findByFollowerId(userId).stream()
                .map(FollowDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FollowDto> getFollowers(Long userId) {
        return followRepository.findByFollowedId(userId).stream()
                .map(FollowDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConnectionDto> getConnections(Long userId) {
        return connectionRepository.findByUserId(userId).stream()
                .map(ConnectionDto::from)
                .toList();
    }

    @Transactional
    public MessageDto sendMessage(Long senderId, SendMessageRequest request) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Sender not found"));
        User recipient = userRepository.findById(request.recipientId())
                .orElseThrow(() -> new IllegalArgumentException("Recipient not found"));

        Connection connection = null;
        if (request.connectionId() != null) {
            connection = connectionRepository.findById(request.connectionId())
                    .orElseThrow(() -> new IllegalArgumentException("Connection not found"));
        } else {
            Optional<Connection> existing = connectionRepository.findBetweenUsers(sender.getId(), recipient.getId());
            connection = existing.orElseGet(() -> connectionRepository.save(new Connection(sender, recipient, null)));
        }

        Message message = new Message(sender, recipient, connection, request.content());
        return MessageDto.from(messageRepository.save(message));
    }

    @Transactional(readOnly = true)
    public List<MessageDto> getMessages(Long userId, Long otherUserId) {
        List<Message> messages = messageRepository.findBySenderIdOrRecipientIdOrderByCreatedAtAsc(userId, userId);
        return messages.stream()
                .filter(msg -> (msg.getSender().getId().equals(otherUserId) || msg.getRecipient().getId().equals(otherUserId)))
                .map(MessageDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MessageDto> getMessagesForConnection(Long connectionId) {
        return messageRepository.findByConnectionIdOrderByCreatedAtAsc(connectionId).stream()
                .map(MessageDto::from)
                .toList();
    }

    @Transactional
    public OpportunityDto createOpportunity(Long ngoId, OpportunityRequest request) {
        User ngo = userRepository.findById(ngoId)
                .orElseThrow(() -> new IllegalArgumentException("NGO not found"));
        if (ngo.getRole() != User.UserType.ORGANIZATION) {
            throw new IllegalArgumentException("Only organizations can create opportunities");
        }
        Opportunity opportunity = new Opportunity(
                ngo,
                request.title(),
                request.description(),
                request.location(),
                request.requirements()
        );
        return OpportunityDto.from(opportunityRepository.save(opportunity));
    }

    @Transactional(readOnly = true)
    public List<OpportunityDto> getOpportunitiesByNgo(Long ngoId) {
        return opportunityRepository.findByNgoIdOrderByCreatedAtDesc(ngoId).stream()
                .map(OpportunityDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OpportunityDto> getAllOpportunities() {
        return opportunityRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(OpportunityDto::from)
                .toList();
    }
}
