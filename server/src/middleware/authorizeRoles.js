import { createHttpError } from '../utils/createHttpError.js';

export function authorizeRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(createHttpError(401, 'Authentication is required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(createHttpError(403, 'You do not have permission to access this resource'));
      return;
    }

    next();
  };
}

