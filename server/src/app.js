import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { adminRoutes } from './routes/admin.routes.js';
import { analyticsRoutes } from './routes/analytics.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { bookingRoutes } from './routes/booking.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { notificationRoutes } from './routes/notification.routes.js';
import { ownerRoutes } from './routes/owner.routes.js';
import { parkingRoutes } from './routes/parking.routes.js';
import { searchRoutes } from './routes/search.routes.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.CLIENT_URLS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/health', healthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/parkings', parkingRoutes);
app.use('/api/search', searchRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
