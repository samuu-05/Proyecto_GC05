/**
 * Exige una sesión autenticada (SCRUM-88 §8.1). Comprueba en cada petición que la cuenta
 * sigue existiendo y activa, para que una desactivación surta efecto sin esperar a que
 * caduque la cookie. Deja en req.user solo el id y el rol: el resto se consulta cuando haga falta.
 */
export function requireAuth(users) {
  return async (req, res, next) => {
    const unauthenticated = () => res.status(401).json({ message: 'Debes iniciar sesión.' });
    const userId = req.session?.userId;
    if (!userId) return unauthenticated();
    try {
      const user = await users.findById(userId);
      if (!user?.activo) {
        // Sesión huérfana o de una cuenta desactivada: se elimina antes de responder.
        return req.session.destroy(() => unauthenticated());
      }
      req.user = { id: user.id, rol: user.rol };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
