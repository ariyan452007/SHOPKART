#!/bin/bash
BASE_URL="http://localhost:5001"
JAR="/tmp/cookie_jar_$$.txt"
JAR2="/tmp/cookie_jar2_$$.txt"
OUT="/tmp/out_$$.json"

cleanup() { rm -f "$JAR" "$JAR2" "$OUT"; }
trap cleanup EXIT

# Read razorpay secret securely without printing it
SECRET=$(grep -E '^RAZORPAY_KEY_SECRET=' "$HOME/Documents/SHOPKART/backend/.env" | cut -d '=' -f2)

# Setup: Register & login primary user
curl -s -X POST "$BASE_URL/customers/register" -H "Content-Type: application/json" -d '{"fullName":"Test","email":"asd123@gmail.com","password":"asd123","phone":"9876543210"}' >/dev/null
curl -s -c "$JAR" -X POST "$BASE_URL/customers/login" -H "Content-Type: application/json" -d '{"email":"asd123@gmail.com","password":"asd123"}' >/dev/null

# Get product IDs
curl -s "$BASE_URL/products" > "$OUT"
PRODUCT_ID=$(node -e "const d=require('$OUT'); const p=d.products.find(x=>x.name==='Dune'); console.log(p ? p._id : '');")
PRODUCT_PRICE=$(node -e "const d=require('$OUT'); const p=d.products.find(x=>x.name==='Dune'); console.log(p ? p.price : 0);")

# Start by emptying cart
curl -s -b "$JAR" "$BASE_URL/cart" > "$OUT"
node -e "const c=require('$OUT'); c.cart.forEach(i => console.log(i.product._id));" | while read -r id; do
  [ -n "$id" ] && curl -s -X DELETE -b "$JAR" "$BASE_URL/cart/$id" >/dev/null
done

# Test 1: Empty cart blocks checkout
STATUS=$(curl -s -o "$OUT" -w "%{http_code}" -X POST -b "$JAR" "$BASE_URL/orders/create-payment-order" -H "Content-Type: application/json" -d '{"shippingAddress":{"fullName":"T","phone":"9876543210","addressLine1":"A","city":"C","state":"S","pincode":"400001"}}')
[ "$STATUS" -eq 400 ] && echo "Test 1: create with empty cart -> 400 (PASS)" || echo "Test 1: FAIL ($STATUS)"

# Add 1 item to cart
curl -s -X POST -b "$JAR" "$BASE_URL/cart/$PRODUCT_ID" >/dev/null

# Test 2: Bad pincode blocks checkout
STATUS=$(curl -s -o "$OUT" -w "%{http_code}" -X POST -b "$JAR" "$BASE_URL/orders/create-payment-order" -H "Content-Type: application/json" -d '{"shippingAddress":{"fullName":"T","phone":"9876543210","addressLine1":"A","city":"C","state":"S","pincode":"123"}}')
[ "$STATUS" -eq 400 ] && echo "Test 2: create with invalid pincode -> 400 (PASS)" || echo "Test 2: FAIL ($STATUS)"

# Test 3: Server ignores fake prices
if [ -z "$SECRET" ]; then
  echo "Test 3, 5, 6: SKIPPED (RAZORPAY_KEY_SECRET missing)"
else
  STATUS=$(curl -s -o "/tmp/test3_$$.json" -w "%{http_code}" -X POST -b "$JAR" "$BASE_URL/orders/create-payment-order" -H "Content-Type: application/json" -d '{"shippingAddress":{"fullName":"T","phone":"9876543210","addressLine1":"A","city":"C","state":"S","pincode":"400001"},"totalAmount":1}')
  AMT=$(node -e "const d=require('/tmp/test3_$$.json'); console.log(d.amount || 0);")
  EXPECTED=$((PRODUCT_PRICE * 100))
  if [ "$STATUS" -eq 201 ] && [ "$AMT" -eq "$EXPECTED" ]; then
    echo "Test 3: create valid ignores fake totalAmount -> 201 (PASS)"
  else
    echo "Test 3: FAIL ($STATUS, $AMT != $EXPECTED)"
  fi
fi

# Test 4: Cart is unchanged after merely opening payment
curl -s -b "$JAR" "$BASE_URL/cart" > "$OUT"
QTY=$(node -e "const c=require('$OUT'); const i=c.cart.find(x=>x.product._id==='$PRODUCT_ID'); console.log(i ? i.quantity : 0);")
[ "$QTY" -eq 1 ] && echo "Test 4: cart still contains item -> PASS" || echo "Test 4: FAIL ($QTY)"

if [ -n "$SECRET" ]; then
  ORDER_ID=$(node -e "const d=require('/tmp/test3_$$.json'); console.log(d.shopKartOrderId || '');")
  RZP_ORDER_ID=$(node -e "const d=require('/tmp/test3_$$.json'); console.log(d.razorpayOrderId || '');")

  # Test 5: Verify payment with fake signature
  STATUS=$(curl -s -o "$OUT" -w "%{http_code}" -X POST -b "$JAR" "$BASE_URL/orders/verify-payment" -H "Content-Type: application/json" -d "{\"shopKartOrderId\":\"$ORDER_ID\",\"razorpay_order_id\":\"$RZP_ORDER_ID\",\"razorpay_payment_id\":\"pay_123\",\"razorpay_signature\":\"fake\"}")
  curl -s -b "$JAR" "$BASE_URL/orders/$ORDER_ID" > "$OUT"
  PAY_STATUS=$(node -e "console.log(require('$OUT').order?.paymentStatus || '');")
  [ "$STATUS" -eq 400 ] && [ "$PAY_STATUS" = "PENDING" ] && echo "Test 5: verify fake sig -> 400 and PENDING (PASS)" || echo "Test 5: FAIL ($STATUS, $PAY_STATUS)"

  # Test 6: Verify payment with valid HMAC-SHA256 signature
  SIG=$(node -e "const c=require('crypto'); console.log(c.createHmac('sha256', '$SECRET').update('$RZP_ORDER_ID|pay_TESTSCRIPT').digest('hex'));")
  STATUS=$(curl -s -o "$OUT" -w "%{http_code}" -X POST -b "$JAR" "$BASE_URL/orders/verify-payment" -H "Content-Type: application/json" -d "{\"shopKartOrderId\":\"$ORDER_ID\",\"razorpay_order_id\":\"$RZP_ORDER_ID\",\"razorpay_payment_id\":\"pay_TESTSCRIPT\",\"razorpay_signature\":\"$SIG\"}")
  curl -s -b "$JAR" "$BASE_URL/orders/$ORDER_ID" > "$OUT"
  PAY_STATUS=$(node -e "console.log(require('$OUT').order?.paymentStatus || '');")
  [ "$STATUS" -eq 200 ] && [ "$PAY_STATUS" = "PAID" ] && echo "Test 6: verify valid sig -> 200 and PAID (PASS)" || echo "Test 6: FAIL ($STATUS, $PAY_STATUS)"

  # Test 7: Cart is emptied upon success
  curl -s -b "$JAR" "$BASE_URL/cart" > "$OUT"
  LEN=$(node -e "console.log(require('$OUT').cart.length);")
  [ "$LEN" -eq 0 ] && echo "Test 7: cart is empty after paid -> PASS" || echo "Test 7: FAIL ($LEN)"
  
  # Test 8: Get orders
  STATUS=$(curl -s -o "$OUT" -w "%{http_code}" -X GET -b "$JAR" "$BASE_URL/orders")
  C=$(node -e "console.log(require('$OUT').count || 0);")
  [ "$STATUS" -eq 200 ] && [ "$C" -ge 1 ] && echo "Test 8: get orders includes order -> 200 (PASS)" || echo "Test 8: FAIL ($STATUS, $C)"
else
  ORDER_ID="fake_order"
fi

# Test 9: Get order with bad/missing ID
STATUS1=$(curl -s -o /dev/null -w "%{http_code}" -X GET -b "$JAR" "$BASE_URL/orders/abc")
STATUS2=$(curl -s -o /dev/null -w "%{http_code}" -X GET -b "$JAR" "$BASE_URL/orders/64b000000000000000000000")
[ "$STATUS1" -eq 400 ] && [ "$STATUS2" -eq 404 ] && echo "Test 9: get order bad id/missing -> 400/404 (PASS)" || echo "Test 9: FAIL ($STATUS1, $STATUS2)"

# Test 10: Unauthorized cross-user access
RAND=$RANDOM
curl -s -X POST "$BASE_URL/customers/register" -H "Content-Type: application/json" -d "{\"fullName\":\"T2\",\"email\":\"test$RAND@x.com\",\"password\":\"123456\",\"phone\":\"9999999999\"}" >/dev/null
curl -s -c "$JAR2" -X POST "$BASE_URL/customers/login" -H "Content-Type: application/json" -d "{\"email\":\"test$RAND@x.com\",\"password\":\"123456\"}" >/dev/null
STATUS1=$(curl -s -o /dev/null -w "%{http_code}" -X GET -b "$JAR2" "$BASE_URL/orders/$ORDER_ID")
STATUS2=$(curl -s -o "$OUT" -w "%{http_code}" -X GET -b "$JAR2" "$BASE_URL/orders")
C=$(node -e "console.log(require('$OUT').count === 0 ? 0 : 1);")
[ "$STATUS1" -eq 404 ] && [ "$STATUS2" -eq 200 ] && [ "$C" -eq 0 ] && echo "Test 10: other user cross-access -> 404 and 0 count (PASS)" || echo "Test 10: FAIL ($STATUS1, $STATUS2, $C)"

# Test 11: Completely unauthenticated requests
S1=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/orders/create-payment-order")
S2=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/orders")
S3=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/orders/$ORDER_ID")
[ "$S1" -eq 401 ] && [ "$S2" -eq 401 ] && [ "$S3" -eq 401 ] && echo "Test 11: no cookie -> 401 (PASS)" || echo "Test 11: FAIL ($S1, $S2, $S3)"
