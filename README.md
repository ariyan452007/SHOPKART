# 🛒 ShopKart — Full-Stack E-Commerce Platform (MERN)

ShopKart is a working online store: customers browse a catalogue, keep a wishlist and cart, pay through **Razorpay**, and track each order from placement to delivery. Store admins manage products and fulfil orders from a dashboard.

| | |
|---|---|
| **Live app** | https://shopkkk.netlify.app |
| **API** | https://shopkart-backend-4dcc.onrender.com/health |
| **Demo video** | _add your video link here_ |

> The API runs on Render's free tier and sleeps when idle. The first request can take 30–60 s while it wakes up; the frontend retries automatically.

---

## ✨ Core workflows

1. **Account & session**: register, then log in. The JWT lives in an **HttpOnly cookie** (it can't be stolen through XSS), and failed logins are rate-limited per email.
2. **Discover**: search with debounce, filter by category (loaded from the database), sort by price, and page through results.
3. **Wishlist & cart**: save items, adjust quantities, and see live stock warnings. You can't add more than is in stock.
4. **Checkout & payment**: enter a validated shipping address and pay with Razorpay (test mode).
   - The server works out the amount itself and never trusts a total sent by the browser.
   - The payment signature is verified with HMAC-SHA256 and a timing-safe comparison.
   - Stock is reserved **atomically** at payment time, so the last unit can never be sold twice. If an item sells out mid-payment, the order is cancelled and **automatically refunded**.
5. **Order tracking**: an order history and a status timeline (Placed → Confirmed → Shipped → Delivered). Customers can **cancel before shipping**, which restores stock and issues a Razorpay refund.
6. **Admin dashboard** (`/admin`, admin accounts only):
   - Revenue, orders by status, customers, and a low-stock list.
   - Order fulfilment, with status changes enforced by a server-side state machine.
   - Product create/edit/delete (deleting also removes the product from every cart and wishlist).

## 🧱 Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, React Router 7, Tailwind CSS 4, Axios, Vite |
| Backend | Node.js, Express 4, MongoDB + Mongoose 8 |
| Auth | bcrypt (10 rounds), JWT in HttpOnly cookie, role-based admin middleware |
| Payments | Razorpay Orders API + Checkout, signature verification, refunds |
| Security | helmet headers, login rate limiting, 100 kb body limit, no internal errors leaked |
| Testing / CI | Node test runner + Supertest (25 API tests), GitHub Actions |
| Hosting | Netlify (frontend) · Render (API) · MongoDB Atlas (database) |

## 🏗 Architecture

```
Browser ──► Netlify (React SPA)
              │  /api/*  (same-origin proxy, see frontend/public/_redirects)
              ▼
            Render (Express API) ──► MongoDB Atlas
              │
              └──► Razorpay (create order, refunds)
```

The browser only ever talks to `shopkkk.netlify.app`, and Netlify proxies `/api/*` to Render. That keeps the auth cookie **first-party**, so login also works in Safari and on iOS, which block third-party cookies.

Backend layout (MVC):

```
backend/
├── app.js                 Express app (middleware, routes, error handling)
├── index.js               DB connection + server start
├── models/                Customer, Product, Order (with lifecycle state machine)
├── controllers/           customer, product, cart, wishlist, order, admin
├── routes/                one router per resource
├── middlewares/           auth (JWT + admin guard), login rate limiter
├── utils/orderService.js  atomic stock reservation, restore, refund, cancel
├── scripts/createAdmin.js
└── tests/                 API tests (Razorpay mocked)
```

## 🚀 Run locally

Prerequisites: Node 20.19+ (22 recommended), MongoDB running locally or an Atlas URI, and Razorpay **test** keys.

```bash
# 1. API
cd backend
cp .env.example .env          # fill in MONGO_URI, JWT_SECRET, Razorpay test keys
npm install
npm run seed                  # 12 sample products
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='choose-a-password' npm run create-admin
npm run dev                   # http://localhost:5001

# 2. Web app (new terminal)
cd frontend
cp .env.example .env          # VITE_API_URL=http://localhost:5001
npm install
npm run dev                   # http://localhost:5173
```

**Test payment:** in Razorpay test mode, use card `4111 1111 1111 1111` with any future expiry and any CVV, or UPI `success@razorpay`.

### Tests

```bash
cd backend && npm test        # needs a local MongoDB (override with MONGO_URI_TEST)
```

The 25 tests cover:

- auth, cookie flags, and login lockout
- the admin guard and product CRUD
- server-side pricing and forged signatures
- double-submitted payments and the oversell/refund race
- cancellation and stock restore
- order-ownership isolation and fulfilment transitions

CI runs them on every push, plus a frontend lint and build.

## 🔐 Environment variables (backend)

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string used to sign tokens (**never commit**) |
| `JWT_EXPIRES_IN`, `COOKIE_EXPIRES_DAYS` | Session length (default 7d) |
| `COOKIE_SAME_SITE` | `strict` when same-origin (proxy), `none` if cross-site |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay test keys |
| `CLIENT_URLS` | Comma-separated CORS origins |
| `NODE_ENV` | `production` on Render (secure cookies, trust proxy, hides dev tester) |

No secrets are committed. `.env` files are git-ignored and only `.env.example` templates are tracked.

## 📡 API overview

| Method | Endpoint | Access |
|---|---|---|
| POST | `/customers/register`, `/customers/login` | Public |
| GET / POST / PATCH | `/customers/me`, `/customers/logout`, `/customers/change-password` | Customer |
| GET | `/products?search=&category=&sort=&page=&limit=`, `/products/categories`, `/products/:id` | Public |
| POST / PATCH / DELETE | `/products`, `/products/:id` | Admin |
| GET / POST / PATCH / DELETE | `/cart`, `/cart/:productId` | Customer |
| GET / POST / DELETE / PATCH | `/wishlist`, `/wishlist/:productId`, `/wishlist/:productId/toggle` | Customer |
| POST | `/orders/create-payment-order`, `/orders/verify-payment` | Customer |
| GET / PATCH | `/orders`, `/orders/:id`, `/orders/:id/cancel` | Customer |
| GET / PATCH | `/admin/stats`, `/admin/orders`, `/admin/orders/:id/status` | Admin |
| GET | `/health` | Public |

See [`backend/README.md`](backend/README.md) for request and response details of the auth endpoints.

## 🧭 Engineering decisions

- **Stock is reserved when payment is verified, not when checkout starts.** A customer who opens the payment popup and walks away doesn't lock stock. Each per-item update is conditional (`stock >= qty`), and partial reservations roll back, so stock can never go negative. A lost race is refunded automatically.
- **Idempotent payment verification.** The order is claimed with an atomic `PENDING → PAID` update, so a double-submitted callback can't reserve stock twice.
- **The order state machine lives on the server** (`Order.TRANSITIONS`). The UI only offers valid next steps, but the API is the authority.
- **Cookie-based sessions behind a same-origin proxy** instead of localStorage tokens, so tokens are out of reach of XSS and work without third-party cookies.
