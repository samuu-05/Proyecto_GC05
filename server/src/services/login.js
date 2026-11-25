
import argon2 from 'argon2';

export class LoginError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

/** Autentica al usuario sin exponer su contraseña ni su hash. */
export function createLoginService(users) {
  return async function login(body) {
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      typeof body.email !== 'string' ||
      typeof body.password !== 'string'
    ) {
      throw new LoginError(400, 'Introduce un correo y una contraseña válidos.');
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      throw new LoginError(400, 'Introduce un correo y una contraseña válidos.');
    }

    const usuario = await users.findByEmail(email);

    // No revelar si el correo existe ni cuál de los datos es incorrecto.
    const credencialesIncorrectas = () =>
      new LoginError(401, 'Correo o contraseña incorrectos.');

    if (!usuario?.activo || !usuario.password_hash) {
      throw credencialesIncorrectas();
    }

    const passwordIsValid = await argon2.verify(
      usuario.password_hash,
      password,
    );

    if (!passwordIsValid) {
      throw credencialesIncorrectas();
    }

    // Devolver únicamente los datos necesarios para crear la sesión.
    return {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };
  };
}
