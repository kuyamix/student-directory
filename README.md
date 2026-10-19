# Student Directory API

A simple Node.js/Express + MongoDB API for managing student records, with JWT authentication and bcrypt password hashing.

---

## Setup

1. Install dependencies:

   ```bash
   npm install
Create a .env file:

env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/student_directory
JWT_SECRET=your_long_random_secret
PORT=3000
Start the server:

bash
npm start
Endpoints
Auth
Method	Endpoint	Description
POST	/api/auth/register	Register a new user
POST	/api/auth/login	Log in and get a token
Students (require Authorization: Bearer <token>)
Method	Endpoint	Description
GET	/api/students	Get all students
GET	/api/students/:id	Get one student
POST	/api/students	Create a student
PUT	/api/students/:id	Update a student
DELETE	/api/students/:id	Delete a student
Reflection
1. Why is it dangerous to store passwords in plain text, and how does hashing prevent harm if the database is compromised?

Plain-text passwords mean anyone who gains read access to the database — through an injection, a leaked backup, or a compromised admin account — immediately has every user's real password. Because people reuse passwords across sites, a single leak cascades into email, banking, and social-media takeovers far beyond this app. Hashing solves this by running each password through a one-way function (bcrypt) at registration time, so the database only ever stores an irreversible digest that cannot be turned back into the password. Bcrypt also salts every hash automatically, so two users with the same password get different hashes. If the database is compromised, the attacker gets a pile of 60-character strings — not working credentials.

2. The login endpoint returns the same error for "user not found" and "wrong password." Why is this better than giving specific messages?

Returning the same 401 Invalid credentials for both cases prevents email enumeration — an attacker probing the login endpoint cannot tell whether a given email is registered, only that the guess failed. Specific messages like "no account with that email" would turn the login form into a free account-discovery tool, which attackers use to build target lists for phishing and credential stuffing. The generic response is a small UX cost paid for a meaningful security gain, and the correct client behaviour is identical in both cases anyway. The same principle applies to signup and password-reset responses.

3. In your own words, what does the middleware do on every protected request, and why is it better than putting token-checking code inside every route handler?

On every protected request, the middleware reads the Authorization header, checks that it begins with Bearer, extracts the token, and calls jwt.verify(token, JWT_SECRET) to validate the signature and expiry. On success it attaches the decoded payload to req.user and calls next(); on failure it returns 401 and the route handler never runs. Centralizing this in one file guarantees consistency (no route can forget to check), gives a single place to update when the auth scheme changes, and keeps route handlers focused on their actual job. It also makes protection visible at a glance: router.get('/', requireAuth, handler).

4. What is one thing that could still go wrong in this system, and how would you address it in a real application?

Token theft via insecure transport: if the API is served over plain HTTP, anyone on the same Wi-Fi can read the Authorization header and replay the token for its full one-hour lifetime, since JWTs are bearer credentials. The fix is to serve everything over HTTPS with HSTS, keep token lifetimes short, and pair short-lived access tokens with refresh tokens. I would also add rate limiting on /login to slow credential stuffing, store tokens in httpOnly SameSite=Strict cookies rather than localStorage if the API is browser-facing, and keep a revocation list keyed on jti so a compromised token can be killed before exp. Rotating JWT_SECRET is the last-resort response that invalidates every token at once.

text

---

## Commit and push

```bash
git add README.md
git commit -m "Add README"
git push origin main
