package com.realestate.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class RazorpayService {

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    private RazorpayClient razorpayClient;

    public RazorpayService(@Value("${razorpay.key.id}") String keyId,
                          @Value("${razorpay.key.secret}") String keySecret) throws RazorpayException {
        this.razorpayClient = new RazorpayClient(keyId, keySecret);
    }

    /**
     * Create a Razorpay order for payment
     */
    public Order createOrder(BigDecimal amount, String currency, String receiptId) throws RazorpayException {
        JSONObject orderRequest = new JSONObject();
        // Razorpay expects amount in paise (smallest currency unit)
        orderRequest.put("amount", amount.multiply(new BigDecimal("100")).intValue());
        orderRequest.put("currency", currency);
        orderRequest.put("receipt", receiptId);

        return razorpayClient.orders.create(orderRequest);
    }

    /**
     * Verify payment signature
     */
    public boolean verifyPaymentSignature(String orderId, String paymentId, String signature) {
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", orderId);
            options.put("razorpay_payment_id", paymentId);
            options.put("razorpay_signature", signature);

            return Utils.verifyPaymentSignature(options, razorpayKeySecret);
        } catch (RazorpayException e) {
            return false;
        }
    }

    public String getKeyId() {
        return razorpayKeyId;
    }
}
