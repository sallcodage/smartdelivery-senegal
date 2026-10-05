import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Connexion from '../pages/auth/Connexion';

const connexion = vi.fn();
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ connexion, annonce: null }) }));

const afficher = () => render(
  <MemoryRouter initialEntries={['/connexion']}>
    <Routes>
      <Route path="/connexion" element={<Connexion />} />
      <Route path="/admin" element={<p>Espace admin</p>} />
      <Route path="/livreur" element={<p>Espace livreur</p>} />
    </Routes>
  </MemoryRouter>
);

async function saisir(email, mdp) {
  const u = userEvent.setup();
  await u.type(screen.getByLabelText(/Adresse e-mail/), email);
  await u.type(screen.getByLabelText(/^Mot de passe/), mdp);
  await u.click(screen.getByRole('button', { name: 'Se connecter' }));
}

describe('Connexion', () => {
  test('redirige selon le rôle renvoyé par le serveur (pas de choix de rôle dans le formulaire)', async () => {
    connexion.mockResolvedValueOnce({ role: 'LIVREUR' });
    afficher();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    await saisir('moussa@exemple.sn', 'Moussa-2026');
    // « Se souvenir de moi » est décoché par défaut : session effacée à la fermeture du navigateur
    expect(connexion).toHaveBeenCalledWith('moussa@exemple.sn', 'Moussa-2026', false);
    expect(await screen.findByText('Espace livreur')).toBeInTheDocument();
  });

  test('affiche le message d\'erreur de l\'API', async () => {
    connexion.mockRejectedValueOnce({ response: { data: { message: 'E-mail ou mot de passe incorrect' } } });
    afficher();
    await saisir('awa@exemple.sn', 'faux');
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou mot de passe incorrect');
  });

  test('champs vides : message sans appel au serveur', async () => {
    connexion.mockClear();
    afficher();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Saisissez votre adresse e-mail');
    expect(connexion).not.toHaveBeenCalled();
  });
});
