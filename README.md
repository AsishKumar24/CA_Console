
# CA CONSOLE  – CA Task & Client Management Backend

CA CONSOLE  is a backend system built to manage **clients, tasks, and staff workflows** for a Chartered Accountant (CA) firm.  
It focuses on **secure authentication, role-based access, and scalable task handling**, with future plans for billing, documents, and payments.

---

## 🔹 What This Project Does (Current)

- Secure **JWT authentication using HTTP-only cookies**
- **Admin & Staff roles**
- Client management (create, list, view)
- Task management:
  - Create tasks for clients
  - Assign tasks to staff
  - Track task status (Not Started, In Progress, Completed)
  - Archive completed tasks instead of deleting them
- Staff sees only assigned tasks
- Admin sees all tasks and clients
- API documentation using **Swagger (dev only)**

---

## 🔹 Tech Stack

- Node.js & Express
- MongoDB & Mongoose
- JWT (cookie-based authentication)
- Swagger (OpenAPI)
- Deployed using Railway
- MongoDB Atlas (M0 free tier)

---

## 🔹 Design Decisions

- Tasks are **not hard-deleted** after completion  
  → They are archived to preserve history and future reporting.
- Authentication uses **cookies**, not localStorage, for better security.
- Billing and payments are **decoupled** from task workflow for flexibility.

---

## 🔹 Planned Features (Next Phases)

These features are intentionally planned for later stages:

- **Billing records linked to tasks**
- **Invoice generation**
- **Razorpay payment integration**
- Client document uploads & verification
- Task-related documents and notes
- Reports & analytics
- Frontend dashboard (React)

---

## 🔹 API Documentation

Swagger is enabled in development mode:
```

/api-docs

````

Swagger is disabled in production for security.

---

## 🔹 Running Locally

```bash
npm install
npm run dev
````

Health check:

```
GET /health
```

---

## 🔹 Project Goal

This project is built as:

- A **real-world backend architecture**
- A **scalable foundation** for a CA firm system
- A **portfolio-ready project** demonstrating production-level backend practices

---

## 👤 Author

**K Asish Kumar**



