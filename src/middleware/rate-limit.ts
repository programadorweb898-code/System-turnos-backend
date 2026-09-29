import { rateLimit } from "express-rate-limit";

export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;

export const PUBLIC_APPOINTMENT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const PUBLIC_APPOINTMENT_RATE_LIMIT_MAX_REQUESTS = 10;

const RATE_LIMIT_MESSAGE = {
  error: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Demasiadas solicitudes. Intente nuevamente más tarde."
  }
};

export const authRateLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  limit: AUTH_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE
});

// El endpoint publico de reserva de turnos no exige autenticacion, asi que sin
// este limite cualquiera podria agotar la agenda de un negocio. Se cuentan
// todas las solicitudes y no solo las fallidas: un abuso que logra crear
// turnos tambien tiene que quedar contenido.
export const publicAppointmentRateLimiter = rateLimit({
  windowMs: PUBLIC_APPOINTMENT_RATE_LIMIT_WINDOW_MS,
  limit: PUBLIC_APPOINTMENT_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE
});
