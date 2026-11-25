import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import { logoutController } from './controllers/logout.js';


import {
  createRegistrationService,
  RegistrationError,
} from './services/register.js';
import { registrationController } from './controllers/register.js';

import {
  createLoginService,
  LoginError,
} from './services/login.js';
import { loginController } from './controllers/login.js';

import { createProfileService, ProfileError } from './services/profile.js';
import { profileController } from './controllers/profile.js';
import { requireAuth } from './security/auth.js';
import { createPasswordService, PasswordError } from './services/password.js';
import { passwordController } from './controllers/password.js';
import { RecoveryError } from './services/recovery.js';
import { recoveryController } from './controllers/recovery.js';
import { createHallazgoService, HallazgoError } from './services/hallazgos.js';
import { createHallazgoRepository } from './repositories/hallazgos.js';
import { hallazgoController, receiveHallazgo } from './controllers/hallazgos.js';
import { createAvisoRepository } from './repositories/avisos.js';
import { createAvisoService, AvisoError } from './services/avisos.js';
import { avisoController } from './controllers/avisos.js';

// Comprobar el formato de las peticiones JSON.
function requireJson(req, res, next) {
  if (!req.is('application/json')) {
    return res.status(415).json({
      message: 'Envía los datos en formato JSON.',
    });
  }

  next();
}

// Protección CSRF mediante lista de orígenes permitidos.
function requireSameOrigin(req, res, next) {
  const origin = req.get('Origin');
  const fetchSite = req.get('Sec-Fetch-Site');

  const reject = () =>
    res.status(403).json({
      message: 'Origen de la petición no permitido.',
    });

  // Nunca permitir peticiones cross-site.
  if (fetchSite === 'cross-site') {
    return reject();
  }

  // Orígenes expresamente autorizados.
  const allowedOrigins = new Set([
    `${req.protocol}://${req.get('host')}`,
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://localhost:5173']
      : []),
    ...(process.env.APP_ORIGIN
      ? [process.env.APP_ORIGIN]
      : []),
  ]);

  if (origin) {
    if (!allowedOrigins.has(origin)) {
      return reject();
    }

    return next();
  }

  // Sin Origin, exigir same-origin.
  if (fetchSite === 'same-origin') {
    return next();
  }

  return reject();
}

/** App independiente del puerto y de la conexión a PostgreSQL. */
export function createApp({
  users,
  sessionMiddleware,
  recovery,
  hallazgoStorage = createHallazgoRepository(),
  avisoStorage = createAvisoRepository(),
  avisoLimit = 30,
  recoveryLimit = 30,
  registrationLimit = 20,
  loginLimit = 10,
  passwordLimit = 20,
  searchLimit = 120,
  logError = () => console.error('Error interno de la aplicación.'),
}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());

  // Evitar el almacenamiento en caché de respuestas privadas.
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // Aplicar las sesiones cuando se haya configurado el middleware.
  if (sessionMiddleware) {
    app.use('/api', sessionMiddleware);
  }

  // Registro de usuarios: conservar la funcionalidad de Marcos.
  app.post(
    '/api/auth/register',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: registrationLimit,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        message: 'Demasiados intentos. Inténtalo más tarde.',
      },
    }),
    requireJson,
    express.json({ limit: '16kb', strict: true }),
    registrationController(createRegistrationService(users)),
  );

  // Inicio de sesión: SCRUM-38.
  app.post(
    '/api/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: loginLimit,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        message: 'Demasiados intentos. Inténtalo más tarde.',
      },
    }),
    requireJson,
    express.json({ limit: '16kb', strict: true }),
    (req, res, next) => {
      if (!req.session) {
        return res.status(503).json({
          message: 'El servicio de autenticación no está disponible.',
        });
      }

      next();
    },
    loginController(createLoginService(users)),
  );


  // Perfil del usuario autenticado: US-005.
  const profile = profileController(createProfileService(users));
  const authenticated = requireAuth(users);

  app.get('/api/profile/me', authenticated, profile.get);

  app.patch(
    '/api/profile/me',
    authenticated,
    requireJson,
    express.json({ limit: '16kb', strict: true }),
    profile.update,
  );

  // Cambio de contraseña: SCRUM-45 y SCRUM-99 / US-006.
  // El bloqueo por cuenta está en el servicio; este límite por IP frena ataques masivos.
  const password = passwordController(createPasswordService(users));
  app.post(
    '/api/profile/me/password',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: passwordLimit,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        message: 'Demasiados intentos. Inténtalo más tarde.',
      },
    }),
    requireSameOrigin,
    authenticated,
    requireJson,
    express.json({ limit: '16kb', strict: true }),
    password.change,
  );

  // Cierre de sesión: SCRUM-39 / US-003.
  app.post(
    '/api/auth/logout',
    requireSameOrigin,
    (req, res, next) => {
      if (!req.session) {
        return res.status(503).json({
          message: 'El servicio de autenticación no está disponible.',
        });
      }

      next();
    },
    logoutController(),
  );

  // El límite por correo (3/h) lo aplica SCRUM-96 en PostgreSQL. Este limita abuso por IP.
  const recoveryRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, limit: recoveryLimit,
    standardHeaders: 'draft-7', legacyHeaders: false,
    message: { message: 'Demasiados intentos. Inténtalo más tarde.' },
  });
  for (const [path, action] of [['forgot-password', 'request'], ['reset-password', 'reset'], ['validate-reset-token', 'validate']]) {
    app.post(`/api/auth/${path}`, recoveryRateLimit, requireJson,
      express.json({ limit: '16kb', strict: true }), recoveryController(recovery, action));
  }

  // SCRUM-49 / SCRUM-103: cualquier cuenta autenticada y activa publica hallazgos.
  // Autenticación y origen se comprueban antes de recibir los buffers de las fotos.
  const hallazgos = hallazgoController(createHallazgoService(hallazgoStorage));
  app.get('/api/hallazgos/opciones', authenticated, hallazgos.options);
  // SCRUM-107 / US-009: foto pública por posición (1-5), solo de hallazgos Activos. Comparte forma de URL
  // con la foto privada de US-010 (por UUID): si el último segmento es un UUID, se cede a esa ruta.
  app.get('/api/hallazgos/:id/imagenes/:posicion',
    (req, _res, next) => next(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.posicion) ? 'route' : undefined),
    authenticated, hallazgos.image);
  // SCRUM-113 / US-010: listado de los hallazgos propios. Antes de /:id para que «mios» no se tome como id.
  app.get('/api/hallazgos/mios', authenticated, hallazgos.listOwn);
  // SCRUM-114 / US-010: consulta del detalle de un hallazgo propio.
  app.get('/api/hallazgos/:id', authenticated, hallazgos.getOwn);
  // SCRUM-114 / US-010: acceso privado a imágenes de hallazgos propios.
  app.get(
    '/api/hallazgos/:id/imagenes/:imagenId',
    authenticated,
    hallazgos.getOwnImage,
  );
  // SCRUM-114 / US-010: historial privado de cambios de estado.
  app.get(
    '/api/hallazgos/:id/historial',
    authenticated,
    hallazgos.getOwnHistory,
  );
  // SCRUM-114 / US-010: edición de un hallazgo propio activo.
  app.patch(
    '/api/hallazgos/:id',
    authenticated,
    requireSameOrigin,
    requireJson,
    express.json({ limit: '16kb', strict: true }),
    hallazgos.updateOwn,
  );
  // SCRUM-114 / US-010: transición de estado de un hallazgo propio.
  app.patch(
    '/api/hallazgos/:id/estado',
    authenticated,
    requireSameOrigin,
    requireJson,
    express.json({ limit: '16kb', strict: true }),
    hallazgos.changeOwnState,
  );
  app.post('/api/hallazgos', authenticated, requireSameOrigin,
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false,
      message: { message: 'Demasiadas publicaciones. Inténtalo más tarde.' } }),
    receiveHallazgo, hallazgos.publish);

  // SCRUM-107 / US-009: búsqueda paginada de hallazgos Activos y sus fotos públicas, con sesión.
  const searchRateLimit = rateLimit({ windowMs: 60 * 1000, limit: searchLimit, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { message: 'Demasiadas búsquedas. Inténtalo dentro de un momento.' } });
  app.get('/api/hallazgos', authenticated, searchRateLimit, hallazgos.search);

  // SCRUM-109 / SCRUM-52: avisos de pérdida, independientes de los hallazgos.
  const avisos = avisoController(createAvisoService(avisoStorage));
  app.get('/api/avisos/opciones', authenticated, avisos.options);
  app.post('/api/avisos', authenticated, requireSameOrigin,
    rateLimit({ windowMs: 15 * 60 * 1000, limit: avisoLimit, standardHeaders: 'draft-7', legacyHeaders: false,
      message: { message: 'Demasiadas publicaciones. Inténtalo más tarde.' } }),
    requireJson, express.json({ limit: '32kb', strict: true }), avisos.publish);

  // SCRUM-57 / US-014: feed paginado de avisos de pérdida activos.
  app.get('/api/avisos', authenticated, avisos.listActive);
  
  app.use('/api', (_req, res) => {
    res.status(404).json({
      message: 'Recurso no encontrado.',
    });
  });

  // Servir React compilado en producción.
  app.use(
    express.static(
      fileURLToPath(new URL('../../client/dist/', import.meta.url)),
    ),
  );

  app.use((_req, res) => {
    res.status(404).send('Recurso no encontrado.');
  });

  // Gestión centralizada de errores.
  app.use((error, req, res, _next) => {
    if (
      error instanceof RegistrationError ||
      error instanceof LoginError ||
      error instanceof ProfileError ||
      error instanceof PasswordError ||
      error instanceof RecoveryError ||
      error instanceof HallazgoError ||
      error instanceof AvisoError
    ) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors ? { errors: error.errors } : {}),
      });
    }

    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({
        message: 'El JSON no es válido.',
      });
    }

    if (error.type === 'entity.too.large') {
      return res.status(413).json({
        message: 'La petición es demasiado grande.',
      });
    }

    // Nunca registrar contraseñas, cookies o datos sensibles.
    logError();

    return res.status(500).json({
      message: req.path === '/api/auth/register'
        ? 'No se ha podido completar el registro.'
        : 'No se ha podido completar la operación.',
    });
  });

  return app;
}
