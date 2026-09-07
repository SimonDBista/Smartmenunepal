# 🇳🇵 Digitalize Nepal — Multi-Tenant QR Menu & Hotel Management Platform

**Digitalize Nepal** is a production-grade, self-hosted web platform designed for restaurants, hotels, and lounges in Nepal. It replaces paper menus with real-time interactive QR menus, table ordering, live order-based chat between diners and receptionists, feedback collection, comprehensive hotel dashboards, and platform super-admin controls.

---

## 🌟 Key Features

### 1. Customer Dining Experience (`/menu/[slug]`)
- **No App or Login Required:** Instant access via QR scan at any dining table.
- **Table Detection:** Automatically detects table numbers via URL query parameter (e.g. `/menu/sitan-dabaka-sekuwa?table=1`).
- **Bilingual Localization:** 1-click toggle between **English** and **नेपाली (Nepali)**.
- **Categorized Menu Grid:** Cards styled with luxury dark & gold/pink accents matching the design specification.
- **3D Food Preview:** Interactive 3D model viewer (`<model-viewer>`) for dishes with 3D enabled.
- **Floating Cart & Instant Ordering:** Add dishes, specify special cooking instructions, and place orders directly to the kitchen.
- **Live Order Tracking Stepper (`/order/[id]`):** Real-time status progression (`Received` → `Preparing` → `Served`) powered by Socket.io.
- **Thank You Celebration Card:** High-aesthetic completion card matching PDF mockup.
- **Live Receptionist Chat:** Real-time two-way messaging between diners and hotel staff.
- **5-Star Post-Order Feedback:** Interactive rating with comments and celebratory confetti.

### 2. Hotel Staff & Kitchen Dashboard (`/dashboard`)
- **Realtime Orders Feed & Kanban:** Live incoming orders stream with zero-dependency browser **Audio Chimes** on incoming orders.
- **1-Click Status Transitions:** Advance orders from Received → In Progress → Done / Cancelled.
- **Printable Thermal Receipts & KOT Slips:** Formatted kitchen order tickets and customer bills.
- **Menu Management (`/dashboard/menu`):** Add/edit/delete dishes, upload images, set NPR prices, and toggle in-stock availability instantly.
- **Live Chat Center (`/dashboard/chat`):** Active table conversation threads with instant reply capability.
- **Customer Reviews & Ratings (`/dashboard/feedback`):** Overall rating calculation, 5-star distribution chart, and customer comments.
- **Sales Analytics & Reports (`/dashboard/reports`):** Daily sales trends, revenue totals, average order value (AOV), and top 8 selling dishes.
- **Table QR Generator (`/dashboard/qr`):** High-resolution QR code generator for general menu and specific tables with printable table tent card template.
- **Subscription Inactivity Guard:** Enforces account status checks (`pending` / `active` / `expired`).

### 3. Platform Super Admin (`/admin`)
- **Admin Control Hub:** Platform metrics (Total Hotels, Active Subscriptions, Total Platform Orders, Total Platform Volume).
- **Provision New Hotels:** Admin-only account creation (no public registration), auto-generating URL slug and temporary password.
- **Instant Status Management:** 1-click dropdown to toggle status (`pending` ↔ `active` ↔ `expired`).
- **Password Reset:** Generate or customize secure passwords for hotel accounts.
- **Global QR Code Viewer:** Preview and download QR codes for any onboarded hotel.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js (App Router + API Routes) |
| **Server Engine** | Node.js HTTP Server + Socket.io 4.x |
| **Database & ORM** | PostgreSQL / SQLite with Prisma ORM 5.x |
| **Realtime WebSockets** | Socket.io with dedicated room isolation (`hotel_${id}`, `order_${id}`) |
| **Authentication** | JWT (`jsonwebtoken`) + `bcryptjs` password hashing |
| **QR Code Generation** | `qrcode` server-side rendering to high-res PNG / Data URL |
| **Styling** | Tailwind CSS with mobile-first dark luxury theme |
| **Deployment** | Docker Compose (App + PostgreSQL 16 + Nginx Reverse Proxy) |

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client & Setup Database
```bash
npx prisma generate
npx prisma db push
```

### 3. Seed Database with Realistic Demo Restaurant Data
```bash
npm run prisma:seed
```

### 4. Start Development Server
```bash
npm run dev
```
Visit `http://localhost:3000` in your browser.

---

## 🔑 Pre-Seeded Demo Credentials

### Platform Super Admin
- **URL:** `http://localhost:3000/admin/login`
- **Email:** `admin@digitalizenepal.com`
- **Password:** `adminpassword123`

### Demo Hotel #1 ("Sitan Dabaka Sekuwa Cornor")
- **Customer QR Menu:** `http://localhost:3000/menu/sitan-dabaka-sekuwa?table=1`
- **Hotel Dashboard:** `http://localhost:3000/dashboard/login`
- **Owner Email:** `sitan@sekuwacornor.com`
- **Password:** `password123`

### Demo Hotel #2 ("Himalayan View Bistro & Lounge")
- **Customer QR Menu:** `http://localhost:3000/menu/himalayan-view-bistro?table=5`
- **Owner Email:** `manager@himalayanbistro.com`
- **Password:** `password123`

---

## 🐳 Self-Hosted VPS Production Deployment (Docker Compose)

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update your domain (e.g. `https://app.digitalizenepal.com`) and secure secrets.

### 2. Launch Containers
```bash
docker-compose up -d --build
```

### 3. Run Database Migrations in Container
```bash
docker-compose exec web npx prisma db push --schema=prisma/schema.postgresql.prisma
docker-compose exec web npx tsx prisma/seed.ts
```

### 4. Setup Daily PostgreSQL Backup Cron (on VPS)
```bash
0 3 * * * docker exec digitalize_nepal_db pg_dump -U postgres digitalizenepal > /backups/db_$(date +\%Y\%m\%d).sql
```
