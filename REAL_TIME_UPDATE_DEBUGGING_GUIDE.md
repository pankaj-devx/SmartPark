# REAL-TIME UPDATE DEBUGGING GUIDE

**Issue:** Admin dashboard not updating in real-time, but Owner dashboard is updating.

---

## DEBUGGING STEPS

### Step 1: Check Browser Console (Admin Dashboard)

Open the admin dashboard and check the browser console for these logs:

**Expected Logs:**
```
[AdminDashboard] Socket connection status: true
[AdminDashboard] Registered parking_slots_updated listener
```

**If you see:**
```
[AdminDashboard] Socket connection status: false
```
or
```
[AdminDashboard] Socket not available, real-time updates disabled
```

**Then:** Socket.IO is not connected for the admin user.

---

### Step 2: Check Backend Logs

When a booking is created, check the server console for:

**Expected Logs:**
```
Booking Created
[BookingService] Emitting parking_slots_updated event: {
  parkingId: '...',
  totalSlots: 50,
  occupiedSlots: 3,
  availableSlots: 47
}
```

**If you see:**
```
[BookingService] Socket.IO not available, cannot emit parking_slots_updated event
```

**Then:** Socket.IO server is not initialized properly.

---

### Step 3: Check Socket.IO Connection in Browser

In the browser console (both admin and owner dashboards), run:

```javascript
// Check if socket is connected
const socket = window.io ? window.io() : null;
console.log('Socket connected:', socket?.connected);
console.log('Socket ID:', socket?.id);
```

**Expected Output:**
```
Socket connected: true
Socket ID: "abc123xyz..."
```

---

### Step 4: Test Event Reception

In the browser console, manually listen for the event:

```javascript
const socket = window.io ? window.io() : null;
if (socket) {
  socket.on('parking_slots_updated', (data) => {
    console.log('MANUAL TEST: Received event:', data);
  });
  console.log('Manual listener registered');
}
```

Then create a booking and see if the event is received.

---

### Step 5: Check Network Tab

1. Open browser DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Look for Socket.IO connection
4. Check if connection is established and active

**Expected:**
- WebSocket connection to `ws://localhost:5000/socket.io/...`
- Status: 101 Switching Protocols
- Connection stays open

---

## COMMON ISSUES AND FIXES

### Issue 1: Socket.IO Not Connected

**Symptoms:**
- `socket?.connected` is `false`
- No WebSocket connection in Network tab

**Possible Causes:**
1. User not authenticated
2. Socket.IO server not running
3. CORS issues

**Fix:**
1. Verify user is logged in (check `auth.user._id`)
2. Check server logs for Socket.IO initialization
3. Verify CORS settings in `server/src/config/socket.js`

---

### Issue 2: Events Not Being Emitted

**Symptoms:**
- Backend logs show booking created
- No `[BookingService] Emitting...` log

**Possible Causes:**
1. `getIO()` returns `null`
2. Socket.IO not initialized in server

**Fix:**
1. Check `server/src/server.js` - ensure `initSocket(httpServer)` is called
2. Verify Socket.IO initialization happens before routes are registered

---

### Issue 3: Events Emitted But Not Received

**Symptoms:**
- Backend logs show event emitted
- Frontend doesn't receive event

**Possible Causes:**
1. Event listener not registered
2. Event name mismatch
3. Socket disconnected

**Fix:**
1. Verify event listener is registered (check console logs)
2. Ensure event name is exactly `'parking_slots_updated'`
3. Check socket connection status

---

### Issue 4: Admin Dashboard Specific Issue

**Symptoms:**
- Owner dashboard updates ✅
- Admin dashboard doesn't update ❌

**Possible Causes:**
1. Admin dashboard component not mounting properly
2. `loadDashboard` function has stale closure
3. useEffect dependency issue

**Fix:**

Check if `loadDashboard` is properly memoized:

```javascript
const loadDashboard = useCallback(async () => {
  // ... load logic
}, [bookingStatus]); // Ensure dependencies are correct
```

Verify useEffect runs:

```javascript
useEffect(() => {
  console.log('[AdminDashboard] useEffect running, loadDashboard:', typeof loadDashboard);
  // ... rest of code
}, [loadDashboard]);
```

---

## TESTING PROCEDURE

### Test 1: Manual Event Emission (Backend)

Add this test endpoint to verify Socket.IO works:

```javascript
// In server/src/routes/test.routes.js (create if doesn't exist)
import { Router } from 'express';
import { getIO } from '../config/socket.js';

const router = Router();

router.post('/test-socket', (req, res) => {
  const io = getIO();
  if (io) {
    io.emit('parking_slots_updated', {
      parkingId: 'test123',
      totalSlots: 100,
      availableSlots: 50,
      test: true
    });
    res.json({ success: true, message: 'Event emitted' });
  } else {
    res.status(500).json({ success: false, message: 'Socket.IO not available' });
  }
});

export default router;
```

Then test:
```bash
curl -X POST http://localhost:5000/api/test-socket
```

Check if admin dashboard receives the event.

---

### Test 2: Check Socket Registration

In browser console:

```javascript
// Get socket instance
import { getSocket } from './services/socket.js';
const socket = getSocket();

// Check registered events
console.log('Socket events:', socket?._callbacks);
```

Look for `$parking_slots_updated` in the callbacks.

---

### Test 3: Force Refresh Test

In admin dashboard, add a manual refresh button:

```javascript
<button onClick={() => {
  console.log('Manual refresh triggered');
  loadDashboard();
}}>
  Manual Refresh
</button>
```

Click it after creating a booking to verify data refresh works.

---

## VERIFICATION CHECKLIST

Before declaring the issue fixed, verify:

- [ ] Backend logs show event emission
- [ ] Admin dashboard console shows socket connected
- [ ] Admin dashboard console shows listener registered
- [ ] Owner dashboard console shows socket connected
- [ ] Owner dashboard console shows listener registered
- [ ] Create booking → Admin dashboard updates automatically
- [ ] Create booking → Owner dashboard updates automatically
- [ ] Cancel booking → Both dashboards update
- [ ] Complete booking → Both dashboards update
- [ ] Multiple tabs → All update simultaneously

---

## QUICK FIX: Force Polling

If WebSocket connection fails, force polling mode:

**Client Side** (`client/src/services/socket.js`):

```javascript
socket = io(SOCKET_URL, {
  transports: ['polling'], // Force polling instead of WebSocket
  withCredentials: true,
  autoConnect: true
});
```

This is slower but more reliable in some network environments.

---

## ADVANCED DEBUGGING

### Enable Socket.IO Debug Mode

**Backend:**
```javascript
// In server/src/config/socket.js
import { Server } from 'socket.io';

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URLS,
      credentials: true
    },
    transports: ['websocket', 'polling'],
    // Enable debug logging
    pingTimeout: 60000,
    pingInterval: 25000
  });
  
  // Log all events
  io.on('connection', (socket) => {
    console.log('[Socket.IO] Client connected:', socket.id);
    
    socket.onAny((eventName, ...args) => {
      console.log('[Socket.IO] Event received:', eventName, args);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Client disconnected:', socket.id, reason);
    });
  });
}
```

**Frontend:**
```javascript
// In client/src/services/socket.js
socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  withCredentials: true,
  autoConnect: true,
  // Enable debug logging
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

socket.onAny((eventName, ...args) => {
  console.log('[Socket.IO Client] Event received:', eventName, args);
});

socket.on('connect', () => {
  console.log('[Socket.IO Client] Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket.IO Client] Disconnected:', reason);
});
```

---

## EXPECTED BEHAVIOR

### Successful Flow

1. **User creates booking**
   ```
   Backend: Booking Created
   Backend: [BookingService] Emitting parking_slots_updated event: {...}
   ```

2. **Admin dashboard receives event**
   ```
   [AdminDashboard] Received parking_slots_updated event: {...}
   [AdminDashboard] Loading admin data...
   [AdminDashboard] Admin data loaded: { bookings: X, users: Y, parkings: Z }
   ```

3. **Owner dashboard receives event**
   ```
   [OwnerDashboard] Received parking_slots_updated event: {...}
   [OwnerDashboard] Loading owner data with filters: {...}
   [OwnerDashboard] Owner data loaded: { bookings: X, parkings: Y }
   ```

4. **UI updates**
   - Slot counts refresh
   - Occupancy metrics update
   - No page reload needed

---

## CONTACT FOR HELP

If issue persists after following this guide:

1. Collect all console logs (backend + frontend)
2. Check Network tab for WebSocket connection
3. Verify Socket.IO server is running
4. Check if events are being emitted (backend logs)
5. Check if events are being received (frontend logs)

---

**Last Updated:** 2026-05-10  
**Status:** Debugging in progress
