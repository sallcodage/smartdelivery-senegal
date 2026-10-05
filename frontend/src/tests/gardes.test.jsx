import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RouteProtegee, RoutePublique } from '../routes/Gardes';

let session = { utilisateur: null, initialisation: false };
vi.mock('../context/AuthContext', () => ({ useAuth: () => session }));

function Application({ depart }) {
  return (
    <MemoryRouter initialEntries={[depart]}>
      <Routes>
        <Route element={<RoutePublique />}><Route path="/connexion" element={<p>Page connexion</p>} /></Route>
        <Route element={<RouteProtegee roles={['ADMIN']} />}><Route path="/admin" element={<p>Espace admin</p>} /></Route>
        <Route element={<RouteProtegee roles={['CLIENT']} />}><Route path="/client" element={<p>Espace client</p>} /></Route>
        <Route element={<RouteProtegee roles={['LIVREUR']} />}><Route path="/livreur" element={<p>Espace livreur</p>} /></Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('Protection des routes', () => {
  test('un visiteur non connecté est renvoyé vers la connexion', () => {
    session = { utilisateur: null, initialisation: false };
    render(<Application depart="/admin" />);
    expect(screen.getByText('Page connexion')).toBeInTheDocument();
  });

  test.each([
    ['CLIENT', '/admin', 'Espace client'],
    ['LIVREUR', '/admin', 'Espace livreur'],
    ['CLIENT', '/livreur', 'Espace client'],
    ['ADMIN', '/client', 'Espace admin'],
  ])('un %s qui ouvre %s est renvoyé vers son propre espace', (role, depart, attendu) => {
    session = { utilisateur: { role }, initialisation: false };
    render(<Application depart={depart} />);
    expect(screen.getByText(attendu)).toBeInTheDocument();
  });

  test('un utilisateur connecté qui ouvre /connexion arrive dans son espace', () => {
    session = { utilisateur: { role: 'LIVREUR' }, initialisation: false };
    render(<Application depart="/connexion" />);
    expect(screen.getByText('Espace livreur')).toBeInTheDocument();
  });

  test('pendant la vérification de la session, un chargement est affiché', () => {
    session = { utilisateur: null, initialisation: true };
    render(<Application depart="/admin" />);
    expect(screen.getByRole('status')).toHaveTextContent('Chargement');
  });
});
