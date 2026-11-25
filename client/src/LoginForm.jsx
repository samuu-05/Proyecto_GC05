import { useRef, useState } from 'react';
import { login } from './api/login.js';

/** SCRUM-86 / US-002. La API de Ángel autentica; esta pantalla no verifica hashes. */
export function LoginForm({ onLogin, notice = '' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const submitting = useRef(false);
  const feedback = useRef(null);

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setMessage('');
    setUser(null);
    try {
      // Punto de integración: api/login.js llama al endpoint definido en SCRUM-88.
      // El usuario en memoria no sustituye la validación de sesión del servidor.
      const authenticatedUser = await login({ email, password });
      setUser(authenticatedUser);
      setMessage('Inicio de sesión correcto.');
      onLogin?.(authenticatedUser);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPassword('');
      setVisible(false);
      setPending(false);
      submitting.current = false;
      feedback.current?.focus();
    }
  }

  return <main>
    <header><span className="brand">Lost&Found UEx</span><p>Objetos perdidos y encontrados</p></header>
    <section className="card" aria-labelledby="login-title">
      <h1 id="login-title">Inicia sesión</h1>
      <p>Accede con el correo y la contraseña de tu cuenta.</p>
      {notice && <output className="success">{notice}</output>}
      {!user && <form onSubmit={submit} aria-busy={pending}>
        <label htmlFor="login-email">Correo electrónico</label>
        <input id="login-email" name="email" type="email" autoComplete="username" required maxLength={254}
          value={email} onChange={event => setEmail(event.target.value)} disabled={pending} />
        <label htmlFor="login-password">Contraseña</label>
        <div className="password-field">
          <input id="login-password" name="password" type={visible ? 'text' : 'password'}
            autoComplete="current-password" required maxLength={128}
            value={password} onChange={event => setPassword(event.target.value)} disabled={pending} />
          <button type="button" className="password-toggle" disabled={pending}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-controls="login-password" aria-pressed={visible} onClick={() => setVisible(value => !value)}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {!visible && <path d="m3 3 18 18" />}
            </svg>
          </button>
        </div>
        <button type="submit" disabled={pending}>{pending ? 'Accediendo…' : 'Iniciar sesión'}</button>
      </form>}
      <div ref={feedback} tabIndex={-1} role="status" aria-live="polite" className={user ? 'success' : 'error'}>{message}</div>
      {user && <p>Has accedido como {user.email}.</p>}
      {!user && <p>¿Todavía no tienes cuenta? <a href="#registro">Crear cuenta</a></p>}
      {!user && <p><a href="#recuperar-contrasena">He olvidado mi contraseña</a></p>}
      <p><a href="#portada">Volver a la portada</a></p>
    </section>
  </main>;
}
