package com.squareedgesports.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;

class JwtUtilTest {

    // Secret must be at least 32 bytes for HS256
    private static final String SECRET     = "ThisIsATestSecretKeyForJwtUnitTests!";
    private static final long   EXPIRATION = 3_600_000L; // 1 hour in ms

    JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret",     SECRET);
        ReflectionTestUtils.setField(jwtUtil, "expiration", EXPIRATION);
    }

    // ─── generate() ───────────────────────────────────────────────────────────

    @Test
    void generate_returnsNonBlankToken() {
        String token = jwtUtil.generate("user@example.com", "PLAYER");
        assertThat(token).isNotBlank();
    }

    @Test
    void generate_tokenHasThreeParts() {
        String token = jwtUtil.generate("user@example.com", "PLAYER");
        assertThat(token.split("\\.")).hasSize(3);
    }

    // ─── extractEmail() ───────────────────────────────────────────────────────

    @Test
    void extractEmail_returnsCorrectEmail() {
        String token = jwtUtil.generate("alice@example.com", "PLAYER");
        assertThat(jwtUtil.extractEmail(token)).isEqualTo("alice@example.com");
    }

    // ─── extractRole() ────────────────────────────────────────────────────────

    @Test
    void extractRole_returnsCorrectRole() {
        String token = jwtUtil.generate("admin@example.com", "ADMINISTRATOR");
        assertThat(jwtUtil.extractRole(token)).isEqualTo("ADMINISTRATOR");
    }

    @Test
    void extractRole_playerRolePreserved() {
        String token = jwtUtil.generate("player@example.com", "PLAYER");
        assertThat(jwtUtil.extractRole(token)).isEqualTo("PLAYER");
    }

    // ─── isValid() ────────────────────────────────────────────────────────────

    @Test
    void isValid_freshToken_returnsTrue() {
        String token = jwtUtil.generate("user@example.com", "PLAYER");
        assertThat(jwtUtil.isValid(token)).isTrue();
    }

    @Test
    void isValid_tamperedToken_returnsFalse() {
        String token = jwtUtil.generate("user@example.com", "PLAYER");
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";
        assertThat(jwtUtil.isValid(tampered)).isFalse();
    }

    @Test
    void isValid_blankString_returnsFalse() {
        assertThat(jwtUtil.isValid("")).isFalse();
    }

    @Test
    void isValid_randomString_returnsFalse() {
        assertThat(jwtUtil.isValid("not.a.token")).isFalse();
    }

    @Test
    void isValid_expiredToken_returnsFalse() {
        // Expired token — expiration in the past
        ReflectionTestUtils.setField(jwtUtil, "expiration", -1000L);
        String expiredToken = jwtUtil.generate("user@example.com", "PLAYER");

        // Restore normal expiration for the validation check
        ReflectionTestUtils.setField(jwtUtil, "expiration", EXPIRATION);
        assertThat(jwtUtil.isValid(expiredToken)).isFalse();
    }

    // ─── round-trip consistency ────────────────────────────────────────────────

    @Test
    void roundTrip_allRoles_emailAndRolePreserved() {
        String[] roles = { "SUPER_ADMIN", "ADMINISTRATOR", "EMPLOYEE", "PLAYER" };
        for (String role : roles) {
            String email = role.toLowerCase() + "@example.com";
            String token = jwtUtil.generate(email, role);
            assertThat(jwtUtil.extractEmail(token)).isEqualTo(email);
            assertThat(jwtUtil.extractRole(token)).isEqualTo(role);
            assertThat(jwtUtil.isValid(token)).isTrue();
        }
    }

    @Test
    void generate_differentUsersProduceDifferentTokens() {
        String t1 = jwtUtil.generate("user1@example.com", "PLAYER");
        String t2 = jwtUtil.generate("user2@example.com", "PLAYER");
        assertThat(t1).isNotEqualTo(t2);
    }
}
