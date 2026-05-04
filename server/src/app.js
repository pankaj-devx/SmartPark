import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import xss from 'xss-clean';
import { env } from './config/env.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';
import { adminRoutes } from './routes/admin.routes.js';
import { analyticsRoutes } from './routes/analytics.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { bookingRoutes } from './routes/booking.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { notificationRoutes } from './routes/notification.routes.js';
import { ownerRoutes } from './routes/owner.routes.js';
import { parkingRoutes } from './routes/parking.routes.js';
import { paymentRoutes } from './routes/payment.routes.js';
import { reviewRoutes } from './routes/review.routes.js';
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

app.use('/api/payments/webhook', express.raw({ type: 'application/json', limit: '10kb' }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitizeRequest);
app.use(xssCleanRequest);
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

app.use('/api/health', healthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/parkings', parkingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/search', searchRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

function mongoSanitizeRequest(req, _res, next) {
  if (req.body && !Buffer.isBuffer(req.body)) {
    mongoSanitize.sanitize(req.body);
  }

  if (req.query) {
    mongoSanitize.sanitize(req.query);
  }

  if (req.params) {
    mongoSanitize.sanitize(req.params);
  }

  next();
}

function xssCleanRequest(req, res, next) {
  const clean = xss();
  const target = {
    body: Buffer.isBuffer(req.body) ? undefined : req.body,
    params: req.params
  };

  clean(target, res, (error) => {
    if (error) {
      next(error);
      return;
    }

    if (!Buffer.isBuffer(req.body)) {
      req.body = target.body;
    }
    req.params = target.params;
    next();
  });
}
