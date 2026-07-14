package com.squareedgesports.service;

import com.razorpay.*;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.util.Map;

@Service @Slf4j
public class RazorpayService {

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    public Map<String, Object> createOrder(BigDecimal amountInDollars, String receipt) {
        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            JSONObject options = new JSONObject();
            // Razorpay expects amount in cents (1 USD = 100 cents)
            int cents = amountInDollars.multiply(BigDecimal.valueOf(100)).intValue();
            options.put("amount", cents);
            options.put("currency", "USD");
            options.put("receipt", receipt);
            Order order = client.orders.create(options);
            JSONObject json = order.toJson();
            return Map.of(
                "orderId",  json.getString("id"),
                "amount",   json.getInt("amount"),
                "currency", json.getString("currency"),
                "keyId",    keyId
            );
        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed: {}", e.getMessage());
            throw new RuntimeException("Payment order creation failed: " + e.getMessage());
        }
    }

    public boolean verifySignature(String orderId, String paymentId, String signature) {
        // SDK 1.4.3 Utils.verifyPaymentSignature does not throw on mismatch, so we
        // compute HMAC-SHA256 directly — the same algorithm Razorpay specifies.
        try {
            String payload = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(keySecret.getBytes(), "HmacSHA256"));
            byte[] raw = mac.doFinal(payload.getBytes());
            StringBuilder sb = new StringBuilder(raw.length * 2);
            for (byte b : raw) sb.append(String.format("%02x", b));
            String expected = sb.toString();
            boolean valid = expected.equals(signature);
            if (!valid) {
                log.warn("Razorpay signature mismatch for order {}", orderId);
            }
            return valid;
        } catch (Exception e) {
            log.error("Razorpay signature verification error: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Initiate a full or partial refund via Razorpay.
     * @param gatewayPaymentId the razorpay_payment_id from the original transaction
     * @param amountInDollars  amount to refund (in $, will be converted to cents)
     * @return map containing refundId and amount (cents)
     */
    public Map<String, Object> refund(String gatewayPaymentId, BigDecimal amountInDollars) {
        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            JSONObject options = new JSONObject();
            int cents = amountInDollars.multiply(BigDecimal.valueOf(100)).intValue();
            options.put("amount", cents);
            Refund refund = client.payments.refund(gatewayPaymentId, options);
            JSONObject json = refund.toJson();
            log.info("Razorpay refund initiated: id={} amount={} cents", json.getString("id"), cents);
            return Map.of("refundId", json.getString("id"), "amount", cents);
        } catch (RazorpayException e) {
            log.error("Razorpay refund failed for payment {}: {}", gatewayPaymentId, e.getMessage());
            throw new RuntimeException("Razorpay refund failed: " + e.getMessage());
        }
    }
}
