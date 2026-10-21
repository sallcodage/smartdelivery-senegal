import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RedirectionAccueil, RouteProtegee, RoutePublique } from '../routes/Gardes';

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

describe('Page d\'accueil publique (« / »)', () => {
  const Racine = ({ depart = '/' }) => (
    <MemoryRouter initialEntries={[depart]}>
      <Routes>
        <Route path="/" element={<RedirectionAccueil visiteur={<p>Page d'accueil</p>} />} />
        <Route path="/connexion" element={<p>Page connexion</p>} />
        <Route path="/client" element={<p>Espace client</p>} />
        <Route path="/admin" element={<p>Espace admin</p>} />
      </Routes>
    </MemoryRouter>
  );

  test('un visiteur non connecté voit la page d\'accueil', () => {
    session = { utilisateur: null, initialisation: false };
    render(<Racine />);
    expect(screen.getByText('Page d\'accueil')).toBeInTheDocument();
  });

  test.each([['CLIENT', 'Espace client'], ['ADMIN', 'Espace admin']])('un %s connecté est envoyé dans son espace', (role, attendu) => {
    session = { utilisateur: { role }, initialisation: false };
    render(<Racine />);
    expect(screen.getByText(attendu)).toBeInTheDocument();
  });

  test('sans page d\'accueil fournie, le visiteur est envoyé vers la connexion', () => {
    session = { utilisateur: null, initialisation: false };
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<RedirectionAccueil />} />
          <Route path="/connexion" element={<p>Page connexion</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Page connexion')).toBeInTheDocument();
  });
});
