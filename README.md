# 🚗 SmartPark — Intelligent Parking Management Platform

SmartPark is a full-stack smart parking marketplace that enables **drivers to find and book parking**, **owners to manage spaces**, and **admins to control the system** — all powered by real-time updates and location intelligence.

---

# 🌟 Key Features

## 👤 Driver (User)

* 🔍 Search nearby parking based on location
* 🗺️ Interactive map with live parking markers
* 🧭 Navigation with route, distance & ETA
* ⭐ Smart parking recommendations
* 📍 Nearby landmarks (cafes, hospitals, etc.)
* 📅 Book parking slots (multi-day supported)
* 🚘 Vehicle-based pricing (2-wheeler / 4-wheeler)
* 🔔 Real-time booking notifications
* 📄 View booking history

---

## 🏢 Parking Owner

* ➕ Create and manage parking listings
* 💰 Set different pricing for vehicle types
* 📊 Manage parking availability & slots
* 📄 View individual parking details *(in progress)*
* 🔔 Receive real-time booking alerts

---

## 🛠️ Admin Panel

* 📋 View and manage all bookings
* 👥 Monitor users and system activity *(in progress)*
* 🅿️ Parking moderation system *(planned)*
* 💬 Communication system *(planned)*

---

# 🧠 Core Capabilities

* ⚡ Real-time system using Socket.IO
* 🧭 Location-based discovery (Leaflet + OpenStreetMap)
* 📊 Smart ranking (distance + price + availability)
* 💰 Dynamic pricing per vehicle type
* ⏱️ Multi-day & cross-day booking support
* 🔄 Fault-tolerant architecture (API + real-time fallback)

---

# 🗺️ Phase Breakdown

## Phase 7A — Maps & Location Intelligence

* Detect user location
* Show nearby parking markers
* Map + list synchronization

## Phase 7B — Routing & Navigation

* Route from user → parking
* Distance & ETA calculation
* Polyline route visualization
* Open in Google Maps

## Phase 7C — Smart Intelligence

* Nearby landmarks
* Smart parking recommendations

## Phase 8 — Notifications System

* Booking confirmations
* Real-time updates using Socket.IO

---

# 🏗️ Tech Stack

## Frontend

* React (Vite)
* Tailwind CSS
* React Leaflet

## Backend

* Node.js
* Express.js
* MongoDB (Mongoose)
* Socket.IO

## APIs & Services

* OpenStreetMap (map tiles)
* OpenRouteService (routing)
* Overpass API (nearby places)

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
│   │   │   ├── parkings/
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
git clone https://github.com/your-username/SmartPark.git
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

### Frontend (`client/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 4. Run Project

```bash
# Run backend
cd server
npm run dev

# Run frontend
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

* [ ] Authentication works (User / Owner / Admin)
* [ ] Parking creation (owner)
* [ ] Search & filtering
* [ ] Booking system works
* [ ] Vehicle-based pricing applied
* [ ] Multi-day booking works
* [ ] Map loads correctly
* [ ] Nearby parking appears
* [ ] Route draws on map
* [ ] Distance & ETA displayed
* [ ] Real-time notifications work

---

# 🚀 Upcoming Features

* 💬 Chat system (Driver ↔ Owner ↔ Admin)
* 📊 Owner analytics (earnings, bookings)
* ⭐ Ratings & reviews
* 💳 Payment integration (Razorpay/Stripe)
* 🛠️ Admin moderation panel
* 🌐 Deployment (Vercel + Render)

---

# 🎯 Project Vision

SmartPark aims to become a **real-world smart mobility platform**, combining:

* Geospatial intelligence
* Real-time systems
* Scalable marketplace architecture

---

# 🤝 Contributing

Contributions are welcome!

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

If you like this project, give it a star ⭐ on GitHub!
