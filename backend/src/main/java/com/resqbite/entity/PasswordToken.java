package com.resqbite.entity;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;
@Entity @Table(name="password_reset_tokens", indexes=@Index(name="idx_reset_hash", columnList="tokenHash", unique=true))
public class PasswordToken {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(optional=false, fetch=FetchType.LAZY) private User user;
 @Column(nullable=false, unique=true, length=128) private String tokenHash;
 @Column(nullable=false) private Instant expiresAt;
 private boolean used;
 @CreationTimestamp
 @Column(name="created_at", nullable=false, updatable=false) private Instant createdAt;
 protected PasswordToken() {}
 public PasswordToken(User user,String hash,Instant expires){this.user=user;tokenHash=hash;expiresAt=expires;}
 public User getUser(){return user;} public String getTokenHash(){return tokenHash;}
 public Instant getExpiresAt(){return expiresAt;} public boolean isUsed(){return used;} public void setUsed(boolean v){used=v;}
}
