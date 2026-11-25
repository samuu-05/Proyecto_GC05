
import { LogoutButton } from './LogoutButton.jsx';

const sections = [
  [
    'Objetos encontrados',
    'Publica lo que encuentres y consulta los hallazgos del campus.',
    'Consulta y búsqueda pendientes · US-009',
    [
      ['#buscar-hallazgos', 'Buscar hallazgos'],
      ['#publicar-hallazgo', 'Publicar un hallazgo'],
      ['#mis-hallazgos', 'Mis hallazgos'],
    ],
  ],
  [
    'Avisos de pérdida',
    'Un espacio para avisar de lo que has perdido.',
    'Publicación y consulta de avisos · US-013 y US-014',
    [
      ['#publicar-aviso', 'Publicar un aviso de pérdida'],
      ['#feed-avisos', 'Consultar avisos de pérdida'],
    ],
  ],
  [
    'Tu perfil',
    'Tus datos y la información de contacto.',
    'Pendiente de integración · US-005',
    [
      ['#perfil', 'Acceder a mi perfil'],
    ],
  ],
];

/** Portada de la aplicación con acceso al perfil y cierre de sesión. */
export function HomePage({
  user,
  demo = false,
  onLogout,
  onDemo,
  notice,
}) {
  return (
    <main className="home">
      <header className="home-header">
        <a
          className="brand"
          href={user ? '#app' : '#portada'}
        >
          Lost&Found UEx
        </a>

        {user ? (
          <LogoutButton
            demo={demo}
            onLogout={onLogout}
          />
        ) : (
          <nav aria-label="Acceso a tu cuenta">
            <a href="#inicio-sesion">Iniciar sesión</a>
            <a className="button-link" href="#registro">
              Crear cuenta
            </a>
          </nav>
        )}
      </header>

      {notice && (
        <output className="success">
          {notice}
        </output>
      )}

      {demo && (
        <output className="demo-banner">
          Demostración visual: no hay una sesión real ni se
          envían peticiones de acceso o cierre.
        </output>
      )}

      <section className="hero" aria-labelledby="home-title">
        <span className="eyebrow">
          OBJETOS PERDIDOS Y ENCONTRADOS · CAMPUS UEx
        </span>

        <h1 id="home-title">
          Que perder algo sea solo el principio de encontrarlo.
        </h1>

        <p>
          Un punto de encuentro para ayudar a que los objetos
          vuelvan a sus dueños.
        </p>

        {user ? (
          <p>
            Bienvenido: <strong>{user.email}</strong>
          </p>
        ) : (
          <>
            <div className="hero-actions">
              <a className="button-link" href="#inicio-sesion">
                Entrar en mi cuenta
              </a>

              <a href="#registro">
                Quiero registrarme
              </a>
            </div>

            {onDemo && (
              <button
                className="demo-link"
                type="button"
                onClick={onDemo}
              >
                Ver demostración sin API
              </button>
            )}
          </>
        )}
      </section>

      <section
        className="home-grid"
        aria-label="Espacios de la plataforma"
      >
        {sections.map(([title, description, status, links]) => (
          <article className="card" key={title}>
            <h2>{title}</h2>
            <p>{description}</p>

            {user && !demo ? links.map(([href, label]) => (
              <p key={href}><a href={href}>{label}</a></p>
            )) : <p className="help">{status}</p>}
          </article>
        ))}
      </section>

      <footer>
        Lost&Found UEx · Proyecto académico GPS
      </footer>
    </main>
  );
}
