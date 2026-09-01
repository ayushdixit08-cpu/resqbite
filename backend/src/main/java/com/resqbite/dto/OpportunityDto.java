package com.resqbite.dto;

import com.resqbite.entity.Opportunity;

import java.time.Instant;

public record OpportunityDto(
        Long id,
        UserDto ngo,
        String title,
        String description,
        String location,
        String requirements,
        Instant createdAt
) {
    public static OpportunityDto from(Opportunity opportunity) {
        return new OpportunityDto(
                opportunity.getId(),
                UserDto.from(opportunity.getNgo()),
                opportunity.getTitle(),
                opportunity.getDescription(),
                opportunity.getLocation(),
                opportunity.getRequirements(),
                opportunity.getCreatedAt()
        );
    }
}
