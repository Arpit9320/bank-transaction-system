# 💳 LedgerFlow — Financial Transaction Engine

> A backend-focused financial transaction engine built with **Node.js, Express.js, MongoDB, and Mongoose**, designed to explore atomic money movement, ledger-based accounting, idempotent APIs, authentication, authorization, and failure handling.

[![Node.js](https://img.shields.io/badge/Node.js-Backend-green?logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-API-black?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-green?logo=mongodb)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-ODM-red?logo=mongoose)](https://mongoosejs.com/)
[![JWT](https://img.shields.io/badge/JWT-Authentication-purple?logo=jsonwebtokens)](https://jwt.io/)

---

## 🌐 Live API

**Base URL:** Coming Soon

> The deployed application demonstrates the backend API and its transaction-processing workflows.

---

## 📖 Overview

Most beginner backend projects treat money as a simple numeric balance:

```text
Account
└── balance: ₹10,000
```

A financial system requires more than updating a number. A transfer can involve multiple operations:

```text
Create Transaction
       ↓
Debit Sender
       ↓
Credit Receiver
       ↓
Complete Transaction
```

If one operation succeeds and another fails, the database can become inconsistent. **LedgerFlow** was built to explore how these operations can be treated as a single atomic unit while maintaining an explicit financial history through an immutable ledger. 

The system derives account balances from ledger entries rather than storing a mutable balance field directly on the account.

### 🎯 Project Objectives
The project was built around one core engineering question:

> *How can a backend maintain consistent financial state when a single transfer requires multiple database operations?*

The implementation focuses on:
- Atomic multi-document transactions
- Ledger-based balance calculation
- Idempotent transaction requests
- Authentication and authorization
- Account ownership validation
- Immutable financial records
- Transaction lifecycle management
- Failure and rollback handling
- Database indexing
- Separation of financial commits from external notifications

---

## 🏗️ System Architecture

```text
                         Client
                           │
                           ▼
                    Express REST API
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
      Authentication                 Controllers
             │                           │
             │              ┌────────────┼────────────┐
             │              │            │            │
             ▼              ▼            ▼            ▼
           User          Account     Transaction    Ledger
             │              │            │            │
             └──────────────┴────────────┴────────────┘
                                        │
                                        ▼
                                    MongoDB
```

The application is organized around four primary domain models:

```text
User
 │
 └── Account
       │
       ├── Ledger Entries
       │
       └── Transactions
```

*Authentication infrastructure additionally includes JWT authentication and token blacklisting.*

---

## 💰 How Money Moves

A standard account-to-account transfer follows this lifecycle:

```text
       Request
          │
          ▼
    Validate Input
          │
          ▼
Verify Sender Ownership
          │
          ▼
  Verify Account Status
          │
          ▼
Validate Idempotency Key
          │
          ▼
   Calculate Balance
          │
          ▼
Start MongoDB Transaction
          │
          ▼
Create PENDING Transaction
          │
          ▼
Create DEBIT Ledger Entry
          │
          ▼
Create CREDIT Ledger Entry
          │
          ▼
Mark Transaction COMPLETED
          │
          ▼
   Commit Transaction
          │
          ▼
   Send Email Notification
```

A successful transfer produces:
**1 Transaction + 1 DEBIT Ledger Entry + 1 CREDIT Ledger Entry**

The financial database operations are committed together.

---

## 🔐 Atomic Transaction Processing

A transfer modifies multiple MongoDB documents. Without a database transaction:

- Create Transaction       ✅
- Create Debit Ledger      ✅
- Create Credit Ledger     ❌ *(Fails)*

The database could contain a partial financial operation. LedgerFlow uses a MongoDB session to group the financial writes:

**Success Path:**
```text
START TRANSACTION
       │
       ├── Create Transaction
       ├── Create DEBIT
       ├── Create CREDIT
       └── Mark COMPLETED
                │
                ▼
              COMMIT
```

**Failure Path:**
```text
START TRANSACTION
       │
       ├── Create Transaction
       ├── Create DEBIT
       └── ERROR
             │
             ▼
           ABORT
             │
             ▼
      Rollback Changes
```
This provides atomicity across the related financial database operations.

---

## 📒 Ledger-Based Accounting

The system does not store a mutable balance directly on the account. Instead:

> **Balance = Total Credits - Total Debits**

**Example:**
```text
CREDIT  ₹10,000
CREDIT  ₹2,000
DEBIT   ₹3,000
DEBIT   ₹1,000
----------------
Balance ₹8,000
```

This makes every financial movement explicitly traceable.

### Ledger Immutability
Ledger records are designed to represent historical financial events. The implementation protects them using:
- Mongoose immutable fields
- Middleware preventing update operations
- Middleware preventing delete operations

Once created, ledger entries are not intended to be modified or deleted.

---

## 🔁 Idempotency

Every transaction requires an `idempotencyKey`.

```json
{
  "fromAccount": "ACCOUNT_A",
  "toAccount": "ACCOUNT_B",
  "amount": 500,
  "idempotencyKey": "unique-request-id"
}
```

The system checks whether the key has already been used before processing the request. The database also enforces a unique constraint on `idempotencyKey`.

```text
       Request
          │
          ▼
   Idempotency Key
          │
          ▼
   Already Exists?
          │
    ┌─────┴─────┐
    │           │
   YES          NO
    │           │
    ▼           ▼
 Return      Process
Existing     Request
 State
```

> **Important:** Idempotency and concurrency control are different problems. The current implementation does not fully prevent concurrent transfers from spending the same balance.

---

## 🔒 Authentication & Authorization

### Authentication
- **JWT-based authentication**
- **bcrypt password hashing**
- **HTTP authentication cookies**
- **Token blacklist for logout invalidation**

### Authorization
While Authentication determines *"Who is the user?"*, Authorization determines *"Is the user allowed to perform this operation?"*

For transfers, the sender account is queried using both the account ID and authenticated user ID. This prevents a user from initiating a transfer using another user's account.

### 🚫 Token Invalidation
JWTs are normally stateless, which makes immediate invalidation more difficult. LedgerFlow maintains a blacklist collection using a MongoDB TTL index that automatically removes expired blacklist records.

---

## 🏦 Account Management & System Funding

Users can own multiple financial accounts in various states (`ACTIVE`, `FROZEN`, `CLOSED`). A transfer requires both sender and receiver accounts to be `ACTIVE`.

LedgerFlow also includes a privileged **system-user workflow** for initial account funding. System-user access is protected through dedicated authentication and authorization middleware.

---

## 📊 Database Design

- **User**: `name`, `email`, `password`, `systemUser`
- **Account**: `user`, `status`, `currency`
- **Transaction**: `fromAccount`, `toAccount`, `amount`, `status`, `idempotencyKey`
- **Ledger**: `account`, `amount`, `transaction`, `type` (`CREDIT`/`DEBIT`)

### ⚡ Database Performance
Indexes are applied to frequently queried relationships, including account ownership, transaction sender/receiver, idempotency keys, and ledger account relationships. Account balances are calculated using MongoDB aggregation over ledger entries.

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a user |
| `POST` | `/api/auth/login` | Authenticate user |
| `POST` | `/api/auth/logout` | Logout and invalidate token |

### Accounts
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/accounts/` | Create account |
| `GET` | `/api/accounts/` | Get authenticated user's accounts |
| `GET` | `/api/accounts/balance/:accountId` | Calculate account balance |

### Transactions
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/transaction/` | Transfer funds |
| `POST` | `/api/transaction/system/initial-fund` | Create system-funded transaction |

---

## 🧠 Key Engineering Decisions

| Decision | Reason |
| :--- | :--- |
| **Ledger-based balance** | Keeps financial history explicit |
| **MongoDB transactions** | Prevents partial multi-document writes |
| **Immutable ledger** | Protects historical financial records |
| **Unique idempotency key** | Prevents duplicate transaction records |
| **Account ownership validation**| Prevents unauthorized account usage |
| **JWT authentication** | Provides authenticated request handling |
| **Token blacklist & TTL** | Enables explicit token invalidation and auto-cleanup |
| **Post-commit email** | Keeps external services outside financial commit |
| **Database indexes** | Improves common lookup operations |

---

## ⚠️ Tradeoffs & Limitations

LedgerFlow intentionally focuses on core backend transaction concepts rather than attempting to reproduce a production banking infrastructure.

- **Concurrency:** The current implementation does not fully solve concurrent transfers against the same account (e.g., simultaneous requests reading the same initial balance before writes occur). 
- **Balance Calculation:** Aggregating ledger entries keeps the ledger authoritative but can become expensive as entries grow. A high-scale architecture would maintain a balance projection.
- **Idempotency:** Unique DB constraints protect against duplicate records, but simultaneous duplicate requests would benefit from stronger retry semantics.

---

## 🛠️ Technology Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose, MongoDB Transactions, Aggregation Pipelines
- **Security:** JWT, bcryptjs, HTTP Cookies, Token Blacklisting
- **Communication:** Nodemailer, Gmail OAuth2

---

## 📂 Project Structure

```text
src/
├── config/
│   └── db.js
├── controllers/
│   ├── auth.controller.js
│   ├── account.controller.js
│   └── transaction.controller.js
├── middlewares/
│   └── auth.middleware.js
├── models/
│   ├── user.model.js
│   ├── account.model.js
│   ├── transaction.model.js
│   ├── ledger.model.js
│   └── blacklist.model.js
├── routes/
│   ├── auth.routes.js
│   ├── account.routes.js
│   └── transaction.routes.js
├── services/
│   └── email.service.js
└── app.js

server.js
```

---

## 👨‍💻 Author

**Hritik Srivastava**  
*Full Stack Developer | Software Engineer*  
- **GitHub:** [https://github.com/Arpit9320](https://github.com/Arpit9320)  
- **LinkedIn:** [https://www.linkedin.com/in/hritiksrivastava11/](https://www.linkedin.com/in/hritiksrivastava11/)

---

### ⚠️ Disclaimer
*LedgerFlow is an educational backend engineering project designed to explore financial transaction processing, ledger architecture, database transactions, authentication, authorization, and security concepts. It is not a production banking platform and should not be used to process real financial funds.*