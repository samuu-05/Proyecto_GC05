
import { useEffect, useState } from 'react';
import { RegistrationForm } from './RegistrationForm.jsx';
import { LoginForm } from './LoginForm.jsx';
import { ProfilePage } from './ProfilePage.jsx';
import { HomePage } from './HomePage.jsx';
import { ForgotPasswordForm, ResetPasswordForm } from './RecoveryForms.jsx';
import { PublishFindingPage } from './PublishFindingPage.jsx';
import { SearchFindingsPage } from './SearchFindingsPage.jsx';
import { MyFindingsPage } from './MyFindingsPage.jsx';
import { PublishLostNoticePage } from './PublishLostNoticePage.jsx';
import { FeedAvisosPage } from './FeedAvisosPage.jsx';

const sessionPages = new Map([
  ['#perfil', ProfilePage],
  ['#publicar-hallazgo', PublishFindingPage],
  ['#mis-hallazgos', MyFindingsPage],
  ['#buscar-hallazgos', SearchFindingsPage],
  ['#publicar-aviso', PublishLostNoticePage],
  ['#feed-avisos', FeedAvisosPage],
]);

/** Navegación de registro, inicio de sesión, perfil y cierre de sesión. */
export function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  const [user, setUser] = useState(null);
  const [demo, setDemo] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener('hashchange', update);

    return () => window.removeEventListener('hashchange', update);
  }, []);

  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, [hash]);

  function navigate(destination) {
    window.location.hash = destination;
    setHash(destination);
  }

  function authenticated(account) {
    setUser(account);
    setDemo(false);
    setNotice('');
    navigate('#app');
  }

  function closed() {
    setUser(null);
    setNotice(
      demo
        ? 'Demostración terminada. Puedes iniciar sesión o crear una cuenta.'
        : 'Sesión cerrada correctamente.',
    );
    setDemo(false);

    window.history.replaceState(null, '', '#portada');
    setHash('#portada');
  }

  function preview() {
    setUser({
      id: 'demo',
      email: 'demo@example.com',
      rol: 'USUARIO',
    });
    setDemo(true);
    setNotice('');
    navigate('#app');
  }

  // Los enlaces del correo deben abrirse también si hay estado de usuario en memoria.
  if (hash === '#recuperar-contrasena') return <ForgotPasswordForm />;
  if (hash === '#restablecer-contrasena' || hash.startsWith('#restablecer-contrasena?')) {
    const params = new URLSearchParams(hash.split('?')[1] ?? '');
    const token = params.getAll('token').length === 1 ? params.get('token') : null;
    return <ResetPasswordForm key={hash} token={token} onReset={() => {
      setUser(null);
      setDemo(false);
      setNotice('Contraseña restablecida. Inicia sesión con tu nueva contraseña.');
      // Quitar el secreto de la entrada actual del historial tras completar el cambio.
      window.history.replaceState(null, '', '#inicio-sesion');
      setHash('#inicio-sesion');
    }} />;
  }

  // Registro e inicio de sesión.
  if (!user && hash === '#registro') {
    return <RegistrationForm />;
  }

  if (!user && hash === '#inicio-sesion') {
    return <LoginForm onLogin={authenticated} notice={notice} />;
  }

  const Page = demo ? undefined : sessionPages.get(hash);
  if (Page) return <Page />;

  // Portada pública o pantalla del usuario autenticado.
  return (
    <HomePage
      user={user}
      demo={demo}
      onLogout={closed}
      onDemo={!user && import.meta.env.DEV ? preview : undefined}
      notice={notice}
    />
  );
}
