# 🚗 SmartPark — Smart Parking Management System

SmartPark is a full-stack intelligent parking reservation platform that helps **drivers find and book parking spaces**, enables **parking owners to manage listings and earnings**, and provides **administrators with full system oversight and analytics**.

Built as a real-world SaaS-style full-stack project with authentication, booking workflows, payment integration, occupancy management, notifications, dashboards, and analytics.

---

## 📌 Problem Statement

Finding parking in busy urban areas is frustrating, time-consuming, and inefficient.

Common challenges:

- Drivers waste time searching for parking
- Parking owners cannot efficiently manage reservations
- No centralized booking management
- Manual parking handling causes conflicts and overbooking
- Poor visibility into occupancy and revenue

SmartPark solves these problems with a modern digital parking management platform.

---

# ✨ Key Features

---

## 👤 Driver / User Features

- User registration & secure login
- Role-based authentication
- Discover available parking spaces
- Search parking by location
- Filter parking listings
- View parking details
- Date & time based parking booking
- Multi-slot reservation support
- Razorpay payment integration
- Booking confirmation workflow
- Booking cancellation
- Real-time notification system
- Booking history
- Driver spending analytics
- Responsive UI

---

## 🏢 Parking Owner Features

- Owner dashboard
- Create parking listings
- Edit / update parking details
- Delete parking listings
- View reservations
- Reservation management
- Manual booking completion
- Automatic reservation completion after booking expiry
- Occupancy monitoring
- Reserved slot tracking
- Available slot tracking
- Earnings analytics
- Revenue dashboard
- Peak booking analytics
- Notification alerts
- Performance insights

---

## 🛡️ Admin Features

- Admin authentication
- Admin dashboard
- Platform-wide analytics
- User management
- Parking owner management
- Parking approval/moderation
- Booking oversight
- Revenue monitoring
- Occupancy monitoring
- Reservation tracking
- Notification monitoring
- Full platform visibility

---

# 🧠 Core Business Logic

---

## Slot Reservation Logic

SmartPark uses **reservation-aware slot management**.

Formula:

```text
Available Slots = Total Slots - Reserved Active Slots
```

Where reserved slots include:

- confirmed bookings
- active bookings
- ongoing bookings

Excluded:

- cancelled bookings
- completed bookings
- failed payments
- expired bookings
- refunded bookings

---

## Booking Lifecycle

```text
Booking Created
   ↓
Payment Successful
   ↓
Booking Confirmed
   ↓
Reservation Active
   ↓
Completed / Cancelled
```

---

## Revenue Rules

### Driver Spending

Includes:

✅ successful paid bookings

Excludes:

❌ cancelled bookings  
❌ failed bookings  
❌ expired bookings  

---

### Owner Earnings

Includes:

✅ completed successful bookings

Excludes:

❌ cancelled bookings  
❌ pending bookings  
❌ failed bookings  

---

## Notification Workflow

Notifications are triggered for:

- booking creation
- booking cancellation
- booking completion
- owner reservation events
- admin monitoring events

Recipients:

- User
- Parking Owner
- Admin

---

# 🏗️ System Architecture

```text
Frontend (React)
    ↓
REST API (Express.js)
    ↓
Business Logic Layer (Services)
    ↓
MongoDB Database
    ↓
External Services
   ├── Razorpay Payments
   └── Notification System
```

---

# 🛠️ Tech Stack

## Frontend

- React.js
- Tailwind CSS
- React Router
- Axios
- Chart.js / analytics libraries
- Toast notifications

---

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose

---

## Authentication

- JWT Authentication
- Role-Based Access Control (RBAC)

Roles:

- Driver
- Owner
- Admin

---

## Payments

- Razorpay Payment Gateway

Features:

- secure payment verification
- booking-payment synchronization
- idempotent payment handling

---

## Notifications

- In-app notifications
- Event-driven alerts

---

## Analytics

- Revenue analytics
- Occupancy analytics
- Reservation insights
- Dashboard metrics

---

# 📂 Project Structure

```bash
SmartPark/
│
├── client/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   │
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── config/
│   │
│   └── package.json
│
├── README.md
└── .gitignore
```

---

# 🔌 API Modules

Backend APIs include:

## Authentication

- signup
- login
- logout
- token validation
- role authorization

---

## Parking APIs

- create parking
- update parking
- delete parking
- list public parking
- nearby parking
- parking details
- approvals

---

## Booking APIs

- create booking
- cancel booking
- complete booking
- booking history
- booking tracking

---

## Payment APIs

- create payment order
- verify payment
- payment confirmation

---

## Owner APIs

- dashboard metrics
- reservations
- analytics
- occupancy

---

## Admin APIs

- dashboard analytics
- user management
- owner management
- parking moderation
- booking monitoring

---

# ⚙️ Installation Guide

## Clone Repository

```bash
git clone https://github.com/pankaj-devx/SmartPark.git
cd SmartPark
```

---

## Backend Setup

```bash
cd server
npm install
```

Create environment file:

```bash
server/.env
```

Example:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
CLIENT_URL=http://localhost:5173
```

Run backend:

```bash
npm run dev
```

---

## Frontend Setup

```bash
cd client
npm install
```

Create environment file:

```bash
client/.env
```

Example:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY=your_public_key
```

Run frontend:

```bash
npm run dev
```

---

# 🧪 Testing Guide

Test major workflows:

---

## Driver Flow

- signup/login
- search parking
- booking
- payment
- cancellation
- booking history

---

## Owner Flow

- create parking
- reservation monitoring
- analytics
- occupancy updates
- booking completion

---

## Admin Flow

- moderation
- analytics
- monitoring
- approvals

---

## Critical Business Tests

- slot availability consistency
- cancellation updates
- booking completion updates
- payment consistency
- notification delivery


---

# 🚀 Deployment

SmartPark can be deployed using:

Frontend:

- Vercel
- Netlify

Backend:

- Render
- Railway
- VPS

Database:

- MongoDB Atlas

---

# 🔮 Future Enhancements

Planned improvements:

- Live map parking visualization
- AI parking demand prediction
- Dynamic pricing engine
- Vehicle OCR entry detection
- Parking recommendation engine
- Slot reservation heatmaps
- Push notifications
- Email notifications
- Multi-city scaling

---

# 🤝 Contribution

Contributions are welcome.

Steps:

```bash
fork repository
create feature branch
commit changes
push branch
create pull request
```

---

# 👨‍💻 Author

**Pankaj**  
B.Tech — Artificial Intelligence & Data Science  
Full Stack Developer | Problem Solver | Tech Learner

GitHub: https://github.com/pankaj-devx

---

# 📄 License

This project is licensed under the MIT License.

---

# ⭐ Support

If you found this project useful:

⭐ Star the repository  
🍴 Fork the project  
💡 Share feedback