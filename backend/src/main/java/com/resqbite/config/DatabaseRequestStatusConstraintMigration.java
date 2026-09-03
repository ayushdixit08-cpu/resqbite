package com.resqbite.config;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;

/**
 * Adds the complete persisted workflow state set without removing request data.
 */
@Component
public class DatabaseRequestStatusConstraintMigration {
    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    public DatabaseRequestStatusConstraintMigration(JdbcTemplate jdbcTemplate, DataSource dataSource) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
    }

    @jakarta.annotation.PostConstruct
    @Transactional
    public void migrate() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            if (!"PostgreSQL".equalsIgnoreCase(connection.getMetaData().getDatabaseProductName())) return;
        }
        Boolean tableExists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM information_schema.tables
                WHERE table_schema = current_schema() AND table_name = 'requests')
                """, Boolean.class);
        if (!Boolean.TRUE.equals(tableExists)) return;

        Boolean constraintExists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                WHERE t.relname = 'requests' AND c.conname = 'requests_status_check')
                """, Boolean.class);
        if (Boolean.TRUE.equals(constraintExists)) {
            jdbcTemplate.execute("ALTER TABLE requests DROP CONSTRAINT requests_status_check");
        }
        jdbcTemplate.execute("""
                ALTER TABLE requests ADD CONSTRAINT requests_status_check CHECK
                (status IN ('AVAILABLE','PENDING','ACCEPTED','PICKUP_SCHEDULED','PICKED_UP',
                'IN_TRANSIT','DELIVERED','REJECTED','CANCELLED','COMPLETED'))
                """);
    }
}
