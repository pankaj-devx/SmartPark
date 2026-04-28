import { createHttpError } from '../utils/createHttpError.js';

export function validateRequest(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(
        createHttpError(
          400,
          'Request validation failed',
          result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message
          }))
        )
      );
      return;
    }

    if (source === 'query') {
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }

    next();
  };
}
