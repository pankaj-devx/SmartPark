# 🚗 SmartPark — Intelligent Parking Management Platform

SmartPark is a **full-stack smart parking marketplace** that enables:

* 🚘 Drivers to discover & book parking
* 🏢 Owners to manage parking assets
* 🛠️ Admins to monitor and control the system

Built with **real-time synchronization, geospatial intelligence, and scalable architecture**.

---

# 🌟 Key Features

## 👤 Driver (User)

* 🔍 Search nearby parking using location
* 🗺️ Interactive map (Leaflet + OpenStreetMap)
* 🧭 Route navigation with distance & ETA
* ⭐ Smart parking recommendations
* 📍 Nearby landmarks (cafes, hospitals, etc.)
* 📅 Book parking slots (multi-day support)
* 🚘 Vehicle-based pricing
* 🔔 Real-time notifications (Socket.IO)
* 📄 Booking history
* ⭐ Submit ratings & reviews for completed bookings

---

## 🏢 Parking Owner

* ➕ Create and manage parking listings
* 💰 Dynamic pricing per vehicle type
* 📊 Track bookings and occupancy
* ⭐ View customer reviews & ratings
* 🔔 Receive real-time booking alerts

---

## 🛠️ Admin Panel

* 📋 Manage all bookings
* 👥 Monitor users
* 🅿️ Parking moderation
* ⭐ Review moderation system
* 📊 System-wide analytics

---

# 🧠 Core Capabilities

## ⚡ Real-Time Slot Synchronization (Advanced)

* ✅ Slots computed from active bookings (no stale data)
* ✅ Automatic slot release after booking expiry
* ✅ Consistent across:

  * Driver
  * Guest
  * Owner
  * Admin
* ✅ Multi-tab & multi-user safe

---

## ⭐ Ratings & Reviews System

* ✔ Only completed bookings can be reviewed
* ✔ One review per booking
* ✔ Average rating per parking
* ✔ Owner insights & admin moderation

---

## 🧭 Location Intelligence

* Live map markers
* Route visualization
* Distance & ETA
* Nearby places integration

---

## 🔄 Fault-Tolerant Architecture

* API-first design
* Real-time + fallback support
* Consistent data across views

---

# 🗺️ Development Phases

## Phase 7 — Maps & Intelligence

* Location detection
* Nearby parking discovery
* Map visualization

## Phase 8 — Notifications

* Real-time updates (Socket.IO)
* Booking alerts

## Phase 9 — Admin System

* User management
* Booking control
* Parking moderation

## Phase 10 — Chat System *(optional / skipped)*

## Phase 11 — Smart Dashboards

* Analytics for Driver, Owner, Admin
* Charts & insights

## Phase 12 — Reviews + Slot Sync (Current)

* ⭐ Ratings & Reviews system
* ⚡ Real-time slot availability system
* 🔐 Authentication & API consistency fixes

---

# 🏗️ Tech Stack

## Frontend

* React (Vite)
* Tailwind CSS
* React Leaflet
* Recharts (analytics)

## Backend

* Node.js
* Express.js
* MongoDB (Mongoose)
* Socket.IO

## APIs & Services

* OpenStreetMap
* OpenRouteService
* Overpass API

---

# 📂 Project Structure

```bash
SmartPark/
│
├── client/                # Frontend (React)
│   ├── src/
│   │   ├── features/
│   │   │   ├── map/
│   │   │   ├── bookings/
│   │   │   ├── notifications/
│   │   │   ├── reviews/
│   │   │   ├── analytics/
│   │   ├── pages/
│   │   ├── services/
│
├── server/                # Backend (Node.js)
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middleware/
```

---

# ⚙️ Setup Instructions

## 1. Clone Repository

```bash
git clone https://github.com/pankaj-devx/SmartPark.git
cd SmartPark
```

---

## 2. Install Dependencies

```bash
npm install
cd client && npm install
cd ../server && npm install
```

---

## 3. Environment Variables

### Backend (`server/.env`)

```env
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret
ORS_API_KEY=your_openrouteservice_key
```

---

### Frontend (`client/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 4. Run Project

```bash
# Backend
cd server
npm run dev

# Frontend
cd client
npm run dev
```

---

## 5. Open App

```text
http://localhost:5173
```

---

# 🧪 Testing Checklist

* [ ] Authentication works (Driver / Owner / Admin)
* [ ] Parking creation (owner)
* [ ] Search & filtering
* [ ] Booking system
* [ ] Slot synchronization (real-time)
* [ ] Booking expiry releases slots automatically
* [ ] Map & navigation works
* [ ] Notifications working
* [ ] Reviews submission & display
* [ ] Admin moderation

---

# 🚀 Upcoming Features

* 💳 Payment integration (Stripe / Razorpay)
* 🤖 AI-based parking recommendations
* 📊 Advanced analytics dashboard
* 🌐 Deployment (Vercel + Render)
* 📱 Mobile optimization

---

# 🎯 Project Highlights (Resume Ready)

* Full-stack MERN application
* Real-time system using Socket.IO
* Geospatial mapping integration
* Advanced slot synchronization logic
* Role-based architecture (Driver, Owner, Admin)
* Production-level data consistency handling

---

# 🤝 Contributing

```bash
git checkout -b feature/your-feature
git commit -m "feat: your feature"
git push origin feature/your-feature
```

---

# 📜 License

MIT License

---

# 👨‍💻 Author

**Pankaj**
B.Tech AI & Data Science
Building real-world systems 🚀

---

# ⭐ Support

If you like this project, give it a ⭐ on GitHub!
