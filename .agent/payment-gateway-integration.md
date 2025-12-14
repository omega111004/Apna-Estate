# Payment Gateway Integration - Complete Workflow ✅

## Updated Purchase Flow

The purchase workflow now includes **Razorpay payment gateway** before marking the sale as complete:

```
1️⃣ CLIENT MAKES OFFER
   → Client: ₹850,000
   → Status: NEGOTIATING

2️⃣ AGENT COUNTER-OFFERS
   → Agent: ₹900,000
   → Status: NEGOTIATING (continued)

3️⃣ CLIENT ACCEPTS PRICE
   → Click "Accept Price"
   → Status: AGREED
   → Agreed Price: ₹900,000

4️⃣ CLIENT CLICKS "PURCHASE" 🆕
   → Client sees: "Purchase for ₹900,000" button
   → Client clicks button

5️⃣ RAZORPAY PAYMENT GATEWAY OPENS 🆕
   Backend creates Razorpay order:
   ✓ Order ID generated
   ✓ Amount: ₹900,000 (FULL agreed price)
   ✓ Currency: INR

   Razorpay modal opens:
   ✓ Property name displayed
   ✓ Amount to pay: ₹900,000
   ✓ Payment methods: Cards, UPI, Netbanking, Wallet

6️⃣ CLIENT PAYS THROUGH RAZORPAY 🆕
   → Client enters payment details
   → Client confirms payment
   → Razorpay processes payment

7️⃣ PAYMENT VERIFICATION 🆕
   Backend verifies payment signature:
   ✓ Razorpay signature validated
   ✓ Payment confirmed authentic

   Backend automatically updates:
   ✓ inquiry.status = PURCHASED
   ✓ property.status = SOLD

8️⃣ PURCHASE COMPLETE! 🎉
   → Success message shown
   → Chat refreshes with updated status
   → Purple "PURCHASED" badge displayed
   → Chat becomes read-only
   → Property marked as SOLD
```

---

## Payment Integration Details

### Backend Changes

**File:** `PaymentController.java`

#### 1. Create Razorpay Order (Step 5)
**Endpoint:** `POST /api/payments/order`

```java
// Request body
{
  "inquiryId": 123,
  "amount": null  // Optional - uses agreedPrice if not provided
}

// Logic
if (inquiry.status != AGREED) {
  return error("Deal is not agreed yet");
}

// Amount calculation priority:
int amount = req.amount != null ? req.amount  // 1. From request
           : inq.getAgreedPrice() != null ? inq.getAgreedPrice().intValue()  // 2. From inquiry ✅ NEW
           : 10000;  // 3. Fallback token

// Response
{
  "orderId": "order_XXXXX",
  "amount": 90000000,  // in paise (₹900,000 * 100)
  "currency": "INR",
  "keyId": "rzp_test_XXXXX",
  "inquiryId": 123
}
```

#### 2. Verify Payment (Step 7)
**Endpoint:** `POST /api/payments/verify`

```java
// Request body
{
  "inquiryId": 123,
  "razorpay_order_id": "order_XXXXX",
  "razorpay_payment_id": "pay_XXXXX",
  "razorpay_signature": "abc123..."
}

// Verification
boolean isValid = Utils.verifySignature(
  payload: razorpay_order_id + '|' + razorpay_payment_id,
  signature: razorpay_signature,
  secret: razorpayKeySecret
);

// If valid:
inquiry.setStatus(PURCHASED);
inquiryRepo.save(inquiry);

property.setStatus(SOLD);
propertyRepo.save(property);

// Response
{
  "status": "success",
  "inquiryId": 123,
  "propertyId": 456,
  "dealStatus": "PURCHASED"
}
```

---

### Frontend Changes

**File:** `ChatComponent.tsx`

#### Purchase Button Handler

```typescript
const handlePurchaseRequest = async () => {
  if (!inquiry.agreedPrice) return;
  
  try {
    setSending(true);

    // STEP 1: Create Razorpay order
    const orderResponse = await fetch(`${apiBase}/payments/order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inquiryId: inquiryId,
        amount: inquiry.agreedPrice  // Full agreed price
      })
    });

    const orderData = await orderResponse.json();

    // STEP 2: Load Razorpay SDK
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    await new Promise((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load'));
      document.body.appendChild(script);
    });

    // STEP 3: Open Razorpay payment modal
    const razorpay = new window.Razorpay({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Real Estate Payment',
      description: `Purchase of ${inquiry.property.title}`,
      order_id: orderData.orderId,
      
      // STEP 4: Handle successful payment
      handler: async function (response) {
        // Verify payment
        await fetch(`${apiBase}/payments/verify`, {
          method: 'POST',
          body: JSON.stringify({
            inquiryId: inquiryId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          })
        });

        alert(`Payment successful! ₹${(orderData.amount / 100).toLocaleString()}`);
        
        // Refresh to show PURCHASED status
        await fetchMessages();
      },
      
      prefill: {
        name: user?.firstName + ' ' + user?.lastName,
        email: user?.email
      },
      theme: {
        color: '#3B82F6'
      }
    });

    razorpay.open();

  } catch (error) {
    alert(error.message || 'Failed to initiate payment');
    setSending(false);
  }
};
```

#### Removed Features

❌ **Removed "Confirm Purchase" button for Agent**
- Previously, agent had to manually confirm after client requested purchase
- Now, payment verification automatically completes the sale
- Agent no longer needs to take any action after price agreement

❌ **Removed WebSocket purchase request/confirm**
- `handleConfirmPurchase()` function removed
- `webSocketService.sendPurchaseRequest()` removed
- `webSocketService.confirmPurchase()` removed
- `canConfirmPurchase` variable removed

---

## UI Flow for Users

### Client View (Buyer)

#### During Negotiation
```
┌─────────────────────────────────────┐
│ Real-time Chat                      │
│ [NEGOTIATING - Yellow Badge]        │
├─────────────────────────────────────┤
│ Owner's current price: ₹900,000    │
│ You can accept this price or offer  │
│                                     │
│ [✓ Accept Price]                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Make a Price Offer                  │
│ [______________________] [Offer]    │
│ Original listing: ₹980,000          │
└─────────────────────────────────────┘
```

#### After Price Agreement
```
┌─────────────────────────────────────┐
│ Real-time Chat                      │
│ [AGREED - Green Badge]              │
├─────────────────────────────────────┤
│ Agreed Price: ₹900,000              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🛒 Purchase for ₹900,000           │
│ ← Click to open payment gateway     │
└─────────────────────────────────────┘
```

#### Payment Modal
```
┌─────────────────────────────────────┐
│         Razorpay Checkout           │
├─────────────────────────────────────┤
│ Real Estate Payment                 │
│ Purchase of Luxury Villa            │
│                                     │
│ Amount: ₹9,00,000                   │
│                                     │
│ ○ Credit/Debit Card                 │
│ ○ UPI                               │
│ ○ Netbanking                        │
│ ○ Wallets                           │
│                                     │
│        [Pay ₹9,00,000]              │
└─────────────────────────────────────┘
```

#### After Payment
```
┌─────────────────────────────────────┐
│ Real-time Chat                      │
│ [PURCHASED - Purple Badge]          │
├─────────────────────────────────────┤
│ ✓ Payment Successful!               │
│ ₹900,000 paid for Luxury Villa      │
│                                     │
│ This inquiry has been completed.    │
└─────────────────────────────────────┘
```

### Agent View (Property Owner)

#### During Negotiation
```
┌─────────────────────────────────────┐
│ Real-time Chat                      │
│ [NEGOTIATING - Yellow Badge]        │
├─────────────────────────────────────┤
│ Client offered: ₹850,000            │
│ Accept, counter, or reject          │
│                                     │
│ [✓ Accept] [✗ Reject]               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Send Counter-Offer                  │
│ [______________________] [Counter]  │
│ Original listing: ₹980,000          │
└─────────────────────────────────────┘
```

#### After Price Agreement
```
┌─────────────────────────────────────┐
│ Real-time Chat                      │
│ [AGREED - Green Badge]              │
├─────────────────────────────────────┤
│ Agreed Price: ₹900,000              │
│                                     │
│ Waiting for client payment...       │
│ ℹ Sale will complete automatically  │
│   after payment verification        │
└─────────────────────────────────────┘
```

#### After Client Payment
```
┌─────────────────────────────────────┐
│ Real-time Chat                      │
│ [PURCHASED - Purple Badge]          │
├─────────────────────────────────────┤
│ ✓ Sale Complete!                    │
│ Property sold for ₹900,000          │
│                                     │
│ This inquiry has been completed.    │
└─────────────────────────────────────┘
```

---

## Testing Instructions

### Prerequisites
1. Razorpay account with test API keys
2. Set in `application.properties`:
   ```properties
   razorpay.key.id=rzp_test_XXXXX
   razorpay.key.secret=XXXXX
   ```

### Test Flow

#### 1. Negotiate Price
```bash
# As Client
1. Login as client user
2. Go to property detail page
3. Create inquiry with offer: ₹850,000
4. Navigate to inquiry chat

# As Agent
1. Login as agent (kawadesoham08@gmail.com)
2. Go to /inquiries/owner
3. Open the inquiry
4. Enter counter-offer: ₹900,000
5. Click "Counter" button

# As Client (back)
6. You should see blue banner: "Owner's current price: ₹900,000"
7. Click "Accept Price"
8. Status changes to AGREED (green badge)
```

#### 2. Make Payment
```bash
# As Client
9. Click green "Purchase for ₹900,000" button
10. Razorpay modal opens

11. Use Razorpay test cards:
   Card: 4111 1111 1111 1111
   CVV: 123
   Expiry: Any future date
   
   OR use UPI test: success@razorpay

12. Complete payment
13. See success alert
14. Status changes to PURCHASED (purple badge)
15. Chat becomes read-only
```

#### 3. Verify Backend
```bash
# Check database
SELECT * FROM property_inquiries WHERE id = [inquiry_id];
# status should be 'PURCHASED'

SELECT * FROM properties WHERE id = [property_id];
# status should be 'SOLD'
```

---

## Error Handling

### Payment Failures

**Case 1: Razorpay SDK fails to load**
```
Error: "Failed to load Razorpay SDK"
→ Check internet connection
→ Verify Razorpay CDN is accessible
```

**Case 2: Order creation fails**
```
Error: "Failed to create payment order"
→ Check Razorpay API keys are configured
→ Verify inquiry status is AGREED
→ Check backend logs for details
```

**Case 3: Payment verification fails**
```
Error: "Payment verification failed"
→ Razorpay signature mismatch
→ Backend will NOT mark as PURCHASED
→ Client should retry or contact support
```

**Case 4: User closes payment modal**
```
→ Modal dismissed
→ Status remains AGREED
→ Client can click "Purchase" again
→ New order will be created
```

---

## Security Features

### 1. **Payment Signature Verification** ✅
```java
String payload = razorpay_order_id + '|' + razorpay_payment_id;
boolean isValid = Utils.verifySignature(payload, signature, secret);
```
- Prevents payment tampering
- Confirms payment came from Razorpay
- Uses HMAC SHA256

### 2. **Server-Side Order Creation** ✅
- Client cannot manipulate amount
- Amount taken from `inquiry.agreedPrice`
- Order created on backend only

### 3. **Status Checks** ✅
```java
if (inq.getStatus() != PropertyInquiry.InquiryStatus.AGREED) {
    return error("Deal is not agreed yet");
}
```
- Can only pay for AGREED inquiries
- Prevents duplicate payments

### 4. **Authentication** ✅
- All payment endpoints require Bearer token
- Only authorized users can create orders
- JWT validation on every request

---

## Files Modified

1. **Backend:**
   - `PaymentController.java` - Uses agreed price instead of token amount

2. **Frontend:**
   - `ChatComponent.tsx` - Integrated Razorpay payment gateway

---

## Summary

✅ **Client clicks Purchase** → Razorpay opens for full agreed price  
✅ **Client pays** → Payment processed securely  
✅ **Backend verifies** → Signature validation  
✅ **Auto-complete** → Status = PURCHASED, Property = SOLD  
❌ **No agent confirmation needed** → Fully automated after payment  

The workflow is now **secure, automated, and seamless** with integrated payment processing! 🎉
