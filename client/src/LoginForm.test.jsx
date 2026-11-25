// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { LoginForm } from './LoginForm.jsx';
import { App } from './App.jsx';

beforeEach(() => { vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); window.location.hash = ''; });

async function fill(password = 'Prueba1234') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Correo electrónico'), 'TEST@example.com');
  await user.type(screen.getByLabelText('Contraseña'), password);
  return user;
}

it('impide enviar campos vacíos o correo inválido', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  render(<LoginForm />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  await user.type(screen.getByLabelText('Correo electrónico'), 'incorrecto');
  await user.type(screen.getByLabelText('Contraseña'), 'secreto');
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(fetch).not.toHaveBeenCalled();
});

it('muestra y oculta la contraseña sin enviarla', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  render(<LoginForm />);
  const user = await fill();
  await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
  expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text');
  await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
  expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
  expect(screen.getByLabelText('Contraseña')).toHaveValue('Prueba1234');
  expect(fetch).not.toHaveBeenCalled();
});

it('respeta el contrato y la contraseña, incluye cookies y bloquea duplicados', async () => {
  let resolve;
  const fetch = vi.fn(() => new Promise(done => { resolve = done; }));
  vi.stubGlobal('fetch', fetch);
  render(<LoginForm />);
  const user = await fill(' Prueba1234 ');
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(screen.getByRole('button', { name: 'Accediendo…' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Accediendo…' }));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith('/api/auth/login', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: ' Prueba1234 ' }),
  });
  resolve({ ok: true, json: async () => ({ message: 'Inicio de sesión correcto', user: { id: 'test-id', email: 'test@example.com', rol: 'USUARIO' } }) });
  expect(await screen.findByText('Inicio de sesión correcto.')).toBeInTheDocument();
  expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
});

it.each([
  [400, 'Datos de acceso inválidos.'],
  [401, 'Credenciales incorrectas.'],
  [404, 'El servicio de inicio de sesión todavía no está disponible.'],
  [429, 'Demasiados intentos. Inténtalo más tarde.'],
  [500, 'No se ha podido completar la operación.'],
])('controla HTTP %s sin mostrar detalles internos', async (status, message) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status,
    json: async () => ({ message: 'Cuenta inexistente: detalle privado' }) }));
  render(<LoginForm />);
  const user = await fill();
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(screen.queryByText(/detalle privado/)).not.toBeInTheDocument();
  expect(screen.getByLabelText('Contraseña')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
});

it('permite reintentar tras un fallo de red', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
  render(<LoginForm />);
  const user = await fill();
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(await screen.findByText(/No se pudo conectar/)).toBeInTheDocument();
  expect(screen.getByLabelText('Contraseña')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
});

it.each([{}, null])('no presenta éxito con una respuesta incompleta: %s', async data => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
  render(<LoginForm />);
  const user = await fill();
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(await screen.findByText('La respuesta del servidor no es válida.')).toBeInTheDocument();
});

it('permite navegar desde registro a login y volver', async () => {
  window.location.hash = '#registro';
  render(<App />);
  const user = userEvent.setup();
  expect(screen.getByRole('heading', { name: 'Crea tu cuenta' })).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Iniciar sesión' }));
  expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Crear cuenta' }));
  expect(await screen.findByRole('heading', { name: 'Crea tu cuenta' })).toBeInTheDocument();
});
