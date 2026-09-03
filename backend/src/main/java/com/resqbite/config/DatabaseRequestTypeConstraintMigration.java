package com.resqbite.config;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.List;

/**
 * Safely aligns the persisted request type constraint with Request.RequestType.
 * Existing legacy aliases are converted in place; no rows or tables are deleted.
 */
@Component
public class DatabaseRequestTypeConstraintMigration {
    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    public DatabaseRequestTypeConstraintMigration(JdbcTemplate jdbcTemplate, DataSource dataSource) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
    }

    @jakarta.annotation.PostConstruct
    @Transactional
    public void migrate() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            if (!"PostgreSQL".equalsIgnoreCase(connection.getMetaData().getDatabaseProductName())) {
                return;
            }
        }

        Boolean tableExists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = current_schema() AND table_name = 'requests'
                )
                """, Boolean.class);
        if (!Boolean.TRUE.equals(tableExists)) {
            return;
        }

        Boolean constraintExists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_constraint c
                    JOIN pg_class t ON t.oid = c.conrelid
                    WHERE t.relname = 'requests' AND c.conname = 'requests_type_check'
                )
                """, Boolean.class);

        if (Boolean.TRUE.equals(constraintExists)) {
            jdbcTemplate.execute("ALTER TABLE requests DROP CONSTRAINT requests_type_check");
        }

        jdbcTemplate.update("""
                UPDATE requests
                SET type = CASE
                    WHEN UPPER(type) IN ('FOOD_REQUEST', 'DONATION', 'DONATE', 'REQUEST') THEN 'FOOD_DONATION'
                    ELSE UPPER(type)
                END
                WHERE UPPER(type) IN ('FOOD_REQUEST', 'DONATION', 'DONATE', 'REQUEST')
                """);

        List<String> invalidValues = jdbcTemplate.queryForList("""
                SELECT DISTINCT type FROM requests
                WHERE type IS NULL OR type NOT IN ('VOLUNTEER_TO_NGO', 'NGO_TO_VOLUNTEER', 'FOOD_DONATION')
                """, String.class);
        if (!invalidValues.isEmpty()) {
            throw new IllegalStateException(
                    "Unsupported existing requests.type value(s): " + String.join(", ", invalidValues));
        }

        jdbcTemplate.execute("""
                ALTER TABLE requests
                ADD CONSTRAINT requests_type_check
                CHECK (type IN ('VOLUNTEER_TO_NGO', 'NGO_TO_VOLUNTEER', 'FOOD_DONATION'))
                """);
    }
}
