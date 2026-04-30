# 🚗 SmartPark — Smart Parking Management System

SmartPark is a full-stack parking management platform that helps users **find, book, and navigate to parking spaces** in real time.

It is designed as a **real-world scalable system** with location intelligence, booking logic, and role-based access.

---

## 🌍 Live Features (Current)

### 🔐 Authentication & Roles

* User (Driver)
* Parking Owner
* Admin
* Secure login using JWT

---

### 🅿️ Parking Management

* Owners can add, update, and delete parking listings
* Includes:

  * Address
  * Price
  * Slot count
  * Vehicle type
  * Availability

---

### 🔍 Smart Search & Filters

* Search parking by:

  * Location
  * Vehicle type
  * Availability
* Clean and fast filtering system

---

### 📄 Parking Details

* Full parking info page
* Includes:

  * Pricing
  * Availability
  * Location
  * Booking option

---

### 📅 Booking System

* Reserve parking slots
* Prevents double booking
* Booking status:

  * Pending
  * Confirmed
  * Cancelled

---

## 🗺️ Phase 7A — Maps & Location Intelligence

* Detect user’s current location
* Show nearby parking on map
* Interactive markers using Leaflet
* Map + list synchronization

---

## 🚗 Phase 7B — Routing & Navigation

* Route from user → selected parking
* Distance and ETA calculation
* Route visualization using polyline
* Open in Google Maps navigation

---

## 🧠 Tech Stack

### Frontend

* React (Vite)
* Leaflet + React Leaflet
* Axios

### Backend

* Node.js
* Express.js
* MongoDB (Mongoose)

### APIs & Services

* OpenStreetMap (tiles)
* OpenRouteService (routing API)

---

## 📁 Project Structure

```bash
SmartPark/
│
├── client/                # Frontend (React)
│   ├── src/
│   │   ├── features/map/  # Map & routing logic
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│
├── server/                # Backend (Node.js)
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
```

---

## ⚙️ Setup Instructions

### 1. Clone Repository

```bash
git clone https://github.com/your-username/SmartPark.git
cd SmartPark
```

---

### 2. Install Dependencies

```bash
cd client
npm install

cd ../server
npm install
```

---

### 3. Environment Variables

Create `.env` file inside `client/`:

```env
VITE_ORS_API_KEY=your_openrouteservice_api_key
```

---

### 4. Run Project

```bash
# Run backend
cd server
npm run dev

# Run frontend
cd client
npm run dev
```

---

### 5. Open App

```text
http://localhost:5173
```

---

## 🧪 Testing Checklist

* [ ] Login / Register works
* [ ] Add parking (owner)
* [ ] Search parking
* [ ] Booking system works
* [ ] Map loads correctly
* [ ] Nearby parking appears
* [ ] Route draws on map
* [ ] Distance & ETA displayed

---

## 🚀 Upcoming Features

### Phase 7C — Smart Map Intelligence

* Nearby landmarks
* Best parking suggestions
* Demand heatmaps

### Phase 8 — Notifications

* Booking alerts
* Real-time updates

### Phase 9 — Payments

* Payment gateway integration

---

## 🎯 Project Vision

SmartPark aims to become a **real-world smart mobility solution**, combining:

* Geospatial intelligence
* Real-time booking systems
* Scalable architecture

---

## 🤝 Contributing

Pull requests are welcome.
For major changes, please open an issue first.

---

## 📌 Author

**Pankaj**
B.Tech AI & Data Science Student
Passionate about building real-world applications 🚀

---

## ⭐ Support

If you like this project, give it a star ⭐ on GitHub!
