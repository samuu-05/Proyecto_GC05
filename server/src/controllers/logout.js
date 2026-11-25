/** Invalida la sesión autenticada y elimina su cookie. */
export function logoutController() {
  return (req, res, next) => {
    if (!req.session?.userId) {
      return res.status(401).json({
        message: 'No hay una sesión activa.',
      });
    }

    req.session.destroy((error) => {
      if (error) return next(error);

      res.clearCookie('lostfound.sid', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      return res.status(200).json({
        message: 'Sesión cerrada correctamente.',
      });
    });
  };
}
