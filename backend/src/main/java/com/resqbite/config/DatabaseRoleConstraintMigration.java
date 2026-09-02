package com.resqbite.config;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;

/**
 * Keeps the persisted role values aligned with User.UserType without dropping
 * the users table or any related data.
 */
@Component
public class DatabaseRoleConstraintMigration {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    public DatabaseRoleConstraintMigration(JdbcTemplate jdbcTemplate, DataSource dataSource) {
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

        Boolean usersTableExists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = current_schema()
                      AND table_name = 'users'
                )
                """, Boolean.class);
        if (!Boolean.TRUE.equals(usersTableExists)) {
            return;
        }

        Boolean constraintExists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_constraint constraint_info
                    JOIN pg_class table_info ON table_info.oid = constraint_info.conrelid
                    WHERE table_info.relname = 'users'
                      AND constraint_info.conname = 'users_role_check'
                )
                """, Boolean.class);

        if (Boolean.TRUE.equals(constraintExists)) {
            jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT users_role_check");
        }

        jdbcTemplate.update("""
                UPDATE users
                SET role = CASE
                    WHEN UPPER(role) IN ('NGO', 'ORG', 'ORGANIZATION') THEN 'ORGANIZATION'
                    WHEN UPPER(role) = 'DONOR' THEN 'DONOR'
                    WHEN UPPER(role) = 'VOLUNTEER' THEN 'VOLUNTEER'
                    ELSE role
                END
                """);

        jdbcTemplate.execute("""
                ALTER TABLE users
                ADD CONSTRAINT users_role_check
                CHECK (role IN ('ORGANIZATION', 'DONOR', 'VOLUNTEER'))
                """);
    }
}
