package com.resqbite.repository;
import com.resqbite.entity.PasswordToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface PasswordTokenRepository extends JpaRepository<PasswordToken,Long>{Optional<PasswordToken> findByTokenHash(String hash);}
