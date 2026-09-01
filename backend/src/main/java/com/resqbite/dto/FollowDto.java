package com.resqbite.dto;

import com.resqbite.entity.Follow;

import java.time.Instant;

public record FollowDto(
        Long id,
        UserDto follower,
        UserDto followed,
        Instant createdAt
) {
    public static FollowDto from(Follow follow) {
        return new FollowDto(
                follow.getId(),
                UserDto.from(follow.getFollower()),
                UserDto.from(follow.getFollowed()),
                follow.getCreatedAt()
        );
    }
}
