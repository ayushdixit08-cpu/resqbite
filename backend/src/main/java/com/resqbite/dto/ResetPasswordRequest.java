package com.resqbite.dto;
import jakarta.validation.constraints.*;
public record ResetPasswordRequest(@NotBlank String token, @NotBlank @Size(min=8,max=128) String password) {}
