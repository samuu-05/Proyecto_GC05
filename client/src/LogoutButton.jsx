import { useRef, useState } from 'react';
import { logout } from './api/logout.js';

/** Botón reutilizable SCRUM-181. No elimina usuarios, publicaciones ni cookies a mano. */
export function LogoutButton({ onLogout, demo = false, csrfToken }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  async function close() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      // Solo la demostración explícita evita la API. El acceso real siempre la llama.
      if (!demo) await logout({ csrfToken });
      onLogout();
    } catch (error_) {
      setError(error_.message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return <div className="logout-control">
    <button type="button" onClick={close} disabled={pending} aria-busy={pending}>
      {pending ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
    {error && <p role="alert" className="error">{error}</p>}
  </div>;
}
