import isEmail from 'validator/lib/isEmail.js';

export const NOMBRE_MAX = 100;
export const APELLIDOS_MAX = 150;

export const TEXT_FIELDS = {
  nombre: { max: NOMBRE_MAX, required: 'El nombre es obligatorio.' },
  apellidos: { max: APELLIDOS_MAX, required: 'Los apellidos son obligatorios.' },
};

/** Recorta un texto obligatorio y valida su longitud en caracteres Unicode. */
export function validateRequiredText(value, { max, required }) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return { text, error: required };
  if ([...text].length > max) return { text, error: `No puede superar los ${max} caracteres.` };
  return { text };
}

/** Reglas compartidas por registro, recuperación y cambio de contraseña. No recortar la contraseña. */
export function validatePassword(password) {
  if (typeof password !== 'string' || !password) return 'La contraseña es obligatoria.';
  if ([...password].length < 8 || !/\p{L}/u.test(password) || !/\d/.test(password)) {
    return 'Usa al menos 8 caracteres, una letra y un número.';
  }
  if ([...password].length > 128) return 'La contraseña no puede superar los 128 caracteres.';
  return null;
}

/** Valida tipos antes de procesarlos. No altera ni recorta la contraseña. */
export function validateRegistration(body) {
  const errors = {};
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email) errors.email = 'El correo es obligatorio.';
  else if (email.length > 254 || !isEmail(email, { allow_utf8_local_part: false })) {
    errors.email = 'El formato del correo no es válido.';
  }
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;
  const nombre = validateRequiredText(body?.nombre, TEXT_FIELDS.nombre);
  if (nombre.error) errors.nombre = nombre.error;
  const apellidos = validateRequiredText(body?.apellidos, TEXT_FIELDS.apellidos);
  if (apellidos.error) errors.apellidos = apellidos.error;
  return { email, password, nombre: nombre.text, apellidos: apellidos.text, errors };
}
