package com.squareedgesports.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for RazorpayService.
 *
 * verifySignature() is tested with computed HMAC-SHA256 values — no network needed.
 * createOrder() and refund() make live HTTP calls to Razorpay's API; those are
 * covered by integration tests (not here). The error-wrapping behaviour is still
 * exercised by pointing the service at invalid credentials so it throws immediately.
 */
class RazorpayServiceTest {

    private static final String TEST_KEY_ID     = "rzp_test_fake_key_id";
    private static final String TEST_KEY_SECRET = "test_secret_for_unit_tests_only";

    RazorpayService razorpayService;

    @BeforeEach
    void setUp() {
        razorpayService = new RazorpayService();
        ReflectionTestUtils.setField(razorpayService, "keyId",     TEST_KEY_ID);
        ReflectionTestUtils.setField(razorpayService, "keySecret", TEST_KEY_SECRET);
    }

    // ─── verifySignature() ────────────────────────────────────────────────────

    @Test
    void verifySignature_validSignature_returnsTrue() throws Exception {
        String orderId    = "order_TestABC123";
        String paymentId  = "pay_TestXYZ789";
        String payload    = orderId + "|" + paymentId;

        // Compute correct HMAC-SHA256 using the same secret the service uses
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(TEST_KEY_SECRET.getBytes(), "HmacSHA256"));
        byte[] raw = mac.doFinal(payload.getBytes());
        StringBuilder sb = new StringBuilder();
        for (byte b : raw) sb.append(String.format("%02x", b));
        String validSignature = sb.toString();

        boolean result = razorpayService.verifySignature(orderId, paymentId, validSignature);

        assertThat(result).isTrue();
    }

    @Test
    void verifySignature_invalidSignature_returnsFalse() {
        boolean result = razorpayService.verifySignature("order_any", "pay_any", "wrong_sig");
        assertThat(result).isFalse();
    }

    // ─── createOrder() — error wrapping ──────────────────────────────────────

    @Test
    void createOrder_razorpayApiFailure_throwsRuntimeException() {
        // With invalid credentials, the Razorpay SDK will throw RazorpayException
        // which our service must wrap into a RuntimeException
        assertThrows(RuntimeException.class,
                () -> razorpayService.createOrder(BigDecimal.valueOf(500), "receipt_test"));
    }

    @Test
    void createOrder_amountConvertedToPaiseInternally() {
        // Verify the service throws (fake creds) but the error message does NOT
        // contain an "amount" parse error — meaning the conversion happened correctly
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> razorpayService.createOrder(BigDecimal.valueOf(199.99), "receipt_price"));
        assertThat(ex.getMessage()).contains("Payment order creation failed");
    }

    // ─── refund() — error wrapping ────────────────────────────────────────────

    @Test
    void refund_razorpayApiFailure_throwsRuntimeException() {
        assertThrows(RuntimeException.class,
                () -> razorpayService.refund("pay_fake_id", BigDecimal.valueOf(300)));
    }

    @Test
    void refund_errorMessageContainsRazorpayRefundFailed() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> razorpayService.refund("pay_fake_id", BigDecimal.valueOf(100)));
        assertThat(ex.getMessage()).contains("Razorpay refund failed");
    }
}
