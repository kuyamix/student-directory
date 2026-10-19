
# Student Directory API

A RESTful Node.js / Express + MongoDB API for managing student records, secured with JWT authentication and bcrypt password hashing. Built for the Lesson 5 Auth Lab.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Students](#students-all-routes-require-auth)
- [Data Models](#data-models)
- [Auth Flow](#auth-flow)
- [Testing](#testing)
- [Security Design Decisions](#security-design-decisions)
- [Reflection](#reflection)
- [Author](#author)
- [License](#license)

---

## Overview

The Student Directory API lets an authenticated user:

- Register with an email and password.
- Log in and receive a signed JWT.
- Create, read, update, and delete student records.

Passwords are hashed with **bcrypt** before they reach the database — plaintext is never stored. All student routes require a valid **JWT** sent in the `Authorization: Bearer <token>` header. Tokens expire after one hour.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | MongoDB Atlas (Mongoose 8) |
| Password hashing | bcryptjs |
| Authentication | jsonwebtoken (JWT, HS256) |
| Config | dotenv |

---

## Project Structure

```
student-directory/
├── middleware/
│   └── auth.js             # JWT verification middleware
├── models/
│   ├── Student.js          # Student schema
│   └── User.js             # Auth user schema
├── routes/
│   ├── auth.js             # POST /register, POST /login
│   └── students.js         # Student CRUD (protected)
├── .env                    # Secrets (git-ignored)
├── .env.example            # Template (safe to commit)
├── .gitignore
├── package.json
├── package-lock.json
├── server.js               # Entry point
└── README.md
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/student-directory.git
cd student-directory
npm install
```

### 2. Create `.env`

Copy the template and fill in real values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/student_directory?retryWrites=true&w=majority
JWT_SECRET=<generate_below>
PORT=3000
```

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> ⚠️ If your Atlas password contains characters like `@ : / ? # [ ] %`, URL-encode them (e.g. `@` → `%40`).

### 3. Configure Atlas access

- **Database Access** — ensure a database user exists with read/write on `student_directory`.
- **Network Access** — add your IP address (or `0.0.0.0/0` for local testing only).

### 4. Run

```bash
npm run dev      # with nodemon (auto-restart)
# or
npm start        # plain node
```

Expected output:

```
✅ MongoDB connected
🚀 Server running on port 3000
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | yes | MongoDB Atlas connection string |
| `JWT_SECRET` | yes | Secret used to sign/verify JWTs (≥ 32 random characters) |
| `PORT` | no | HTTP port (defaults to `3000`) |

All real values live in `.env`, which is **git-ignored**. `.env.example` is committed as a template with placeholder values only.

---

## API Reference

Base URL: `http://localhost:3000`

### Auth

#### `POST /api/auth/register`

Create a new user. Password is hashed with bcrypt (cost factor 10).

**Request body**

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Responses**

| Status | Body | Meaning |
|---|---|---|
| `201` | `{ "id": "…", "email": "test@example.com", "role": "user" }` | Created — no password field returned |
| `409` | `{ "error": "Email already registered" }` | Duplicate email |
| `400` | `{ "error": "…" }` | Validation error (missing/invalid fields) |

---

#### `POST /api/auth/login`

Authenticate and receive a JWT.

**Request body**

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Responses**

| Status | Body | Meaning |
|---|---|---|
| `200` | `{ "token": "eyJhbGciOiJIUzI1NiIs…" }` | Success — copy the token |
| `401` | `{ "error": "Invalid credentials" }` | Bad email **or** bad password (identical message for both, to prevent email enumeration) |

**Token payload**

```json
{ "userId": "…", "role": "user", "iat": 1792376481, "exp": 1792380081 }
```

Expires in **1 hour**.

---

### Students (all routes require auth)

Every request must include:

```
Authorization: Bearer <token>
```

| Missing header | `401 { "error": "No token provided" }` |
|---|---|
| Invalid / expired token | `401 { "error": "Invalid or expired token" }` |

#### `GET /api/students`

Return all students, newest first.

- `200 OK` → `[ { …student }, … ]`

#### `GET /api/students/:id`

Return a single student.

- `200 OK` → `{ …student }`
- `404 Not Found` → `{ "error": "Student not found" }`
- `400 Bad Request` → invalid ObjectId

#### `POST /api/students`

Create a student.

**Request body**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "course": "CS",
  "year": 2
}
```

- `201 Created` → `{ …student }`
- `400 Bad Request` → validation error (missing field, duplicate email, etc.)

#### `PUT /api/students/:id`

Update a student.

- `200 OK` → updated student
- `404 Not Found` → `{ "error": "Student not found" }`

#### `DELETE /api/students/:id`

Delete a student.

- `200 OK` → deleted student
- `404 Not Found` → `{ "error": "Student not found" }`

---

## Data Models

### User

```javascript
{
  email:     String,   // required, unique, lowercase
  password:  String,   // required, bcrypt hash (60 chars)
  role:      String,   // 'user' | 'admin', default 'user'
  createdAt: Date,
  updatedAt: Date
}
```

### Student

```javascript
{
  name:      String,   // required
  email:     String,   // required, unique, lowercase
  course:    String,   // required
  year:      Number,   // required, 1–5
  createdAt: Date,
  updatedAt: Date
}
```

---

## Auth Flow

1. **Register** — client sends email + password. The server bcrypt-hashes the password and stores only the hash.
2. **Login** — client sends email + password. The server looks up the user, `bcrypt.compare`s the submitted password against the stored hash, and on success signs a 1-hour JWT containing `userId` and `role`.
3. **Protected requests** — client sends `Authorization: Bearer <token>`. The middleware verifies the signature against `JWT_SECRET` and attaches the decoded payload to `req.user`.
4. **Expiry** — after one hour, `jwt.verify` rejects the token. The client must log in again to get a fresh one.

---

## Testing

### Manual test flow (Thunder Client / Postman / curl)

Run these in order. Save the token from step 4 as a variable (e.g. `{{token}}`) for the subsequent requests.

| # | Method | Endpoint | Header | Body | Expected |
|---|---|---|---|---|---|
| 1 | POST | `/api/auth/register` | — | `{"email":"test@example.com","password":"password123"}` | `201` |
| 2 | POST | `/api/auth/register` | — | same as above | `409` |
| 3 | POST | `/api/auth/login` | — | `{"email":"test@example.com","password":"wrongpass"}` | `401` |
| 4 | POST | `/api/auth/login` | — | `{"email":"test@example.com","password":"password123"}` | `200` + token |
| 5 | GET | `/api/students` | *(none)* | — | `401` "No token provided" |
| 6 | GET | `/api/students` | `Bearer {{token}}` | — | `200 []` |
| 7 | POST | `/api/students` | `Bearer {{token}}` | `{"name":"Jane Doe","email":"jane@example.com","course":"CS","year":2}` | `201` |
| 8 | DELETE | `/api/students/<id>` | `Bearer {{token}}` | — | `200` |
| 9 | GET | `/api/students` | `Bearer garbage` | — | `401` "Invalid or expired token" |

### curl equivalents

```bash
# Register
curl -i -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# → copy the "token" value from the response

# Protected GET
curl -i http://localhost:3000/api/students \
  -H "Authorization: Bearer <paste-token>"

# Protected POST
curl -i -X POST http://localhost:3000/api/students \
  -H "Authorization: Bearer <paste-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","course":"CS","year":2}'

# Protected DELETE
curl -i -X DELETE http://localhost:3000/api/students/<paste-id> \
  -H "Authorization: Bearer <paste-token>"
```

### Verify the bcrypt hash

Open MongoDB Atlas → **Browse Collections** → `student_directory` → `users` → click the `test@example.com` document. The `password` field must be a 60-character string starting `$2b$10$…`, **not** the plaintext.

---

## Security Design Decisions

- **All student routes are protected** — including `POST` and `PUT`, not just `GET` and `DELETE`. The directory contains PII; anonymous writes enable spam injection and unlogged tampering. Since reads are already protected, protecting writes too is consistent and closes the largest abuse surface.
- **Generic login errors** — "user not found" and "wrong password" both return `401 Invalid credentials`, to prevent email enumeration.
- **No password in responses** — `register` returns only `id`, `email`, `role`.
- **Secrets live in `.env` only** — never in source; `.env` is git-ignored, `.env.example` is committed with placeholders.
- **Short token lifetime** — 1 hour, limiting the window during which a stolen token is useful.

---

## Reflection

### 1. Why is it dangerous to store passwords in plain text, and how does hashing prevent harm if the database is compromised?

Storing passwords in plain text means that anyone who gains read access to the database — through a NoSQL injection, a leaked backup, a misconfigured Atlas IP whitelist, or a compromised admin account — immediately has every user's real password. Because people reuse passwords across sites, a single database leak cascades into email, banking, and social-media takeovers far beyond this app. Hashing solves this by running each password through a one-way function (bcrypt) at registration time, so the database only ever stores an irreversible digest; an attacker who steals the hashes cannot recover the passwords from them without brute-forcing each one. Bcrypt also salts every hash automatically, so two users with the same password get different hashes and precomputed rainbow tables become useless. If the database is compromised, the attacker gets a pile of 60-character strings — not working credentials.

### 2. The login endpoint returns the same error for "user not found" and "wrong password." Why is this better than giving specific messages?

Returning the same `401 Invalid credentials` for both cases prevents **email enumeration** — an attacker probing the login endpoint cannot tell whether a given email is registered, only that the guess failed. Specific messages like "no account with that email" would turn the login form into a free account-discovery tool, which attackers then use to build target lists for phishing, credential stuffing, and password-reset abuse. The generic response is a small UX cost paid for a meaningful security gain, and the correct client behaviour is identical in both cases anyway (show "invalid email or password"), so there is no usability loss. The same principle underlies not revealing whether an email is already registered on signup, and always responding "if an account exists, we've sent an email" on password reset.

### 3. In your own words, what does the middleware do on every protected request, and why is it better than putting token-checking code inside every route handler?

On every protected request, the middleware reads the `Authorization` header, checks that it begins with `Bearer `, extracts the token, and calls `jwt.verify(token, JWT_SECRET)` — which validates the signature and enforces expiry. On success it attaches the decoded payload to `req.user` (so downstream handlers know `userId` and `role`) and calls `next()`; on failure it returns `401` and the route handler never runs. Centralizing this in one file is better than pasting the check into every route because it guarantees consistency (no route can forget to check or check slightly differently), it is a single place to update when the auth scheme changes (adding refresh tokens, role checks, revocation), and it keeps route handlers focused on their actual job. It also makes protection visible at a glance: `router.get('/', requireAuth, handler)` documents the intent directly in the route definition.

### 4. What is one thing that could still go wrong in this system (e.g. token theft, no HTTPS, weak secrets), and how would you address it in a real application?

**Token theft via insecure transport.** If the API is served over plain HTTP, anyone on the same Wi-Fi can read the `Authorization` header off the wire and replay the token for its full one-hour lifetime — the server cannot distinguish the thief from the legitimate user because JWTs are bearer credentials. The fix is to serve everything over HTTPS with HSTS, keep token lifetimes short, and pair short-lived access tokens with refresh tokens so a stolen access token expires quickly. I would also add rate limiting on `/login` to slow credential stuffing, store tokens on the client in `httpOnly` `SameSite=Strict` cookies rather than `localStorage` if the API is browser-facing, and — for high-value actions — maintain a token revocation/deny list keyed on `jti` so a compromised token can be killed before `exp`. Rotating `JWT_SECRET` is the last-resort response that invalidates every token at once.

---

## Author

**<Your Name>**
Lesson 5 Auth Lab — Student Directory API
<your-email@example.com>

---

## License

MIT — or your institution's coursework policy, whichever applies.
```

---

## `.env.example` (commit this alongside the README)

Create `.env.example` at the project root with placeholder values only:

```env
# MongoDB Atlas connection string
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/student_directory?retryWrites=true&w=majority

# Generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=replace_me_with_a_long_random_string

# HTTP port
PORT=3000
```

`.env.example` **is safe to commit** — it contains no real secrets. The real `.env` stays ignored.

---

## Before You Push — Two Edits

1. In **Setup → 1. Clone**, replace `<your-username>` with your actual GitHub username.
2. In **Author**, replace `<Your Name>` and `<your-email@example.com>` with your real details.

Everything else marked with `<…>` is an instruction to the reader (`<paste-token>`, `<paste-id>`, `<password>` in the URI) — leave those as placeholders.

---

## Commit and push

```bash
git add README.md .env.example
git commit -m "Add README with setup, API reference, and reflection; add .env.example"
git push origin main
```

Verify on GitHub:

- `README.md` renders on the repo home page — headings, tables, and code blocks all display properly.
- `.env.example` appears in the file list.
- `.env` does **not** appear anywhere.

---
