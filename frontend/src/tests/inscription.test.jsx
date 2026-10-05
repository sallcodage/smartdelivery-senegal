import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Inscription from '../pages/auth/Inscription';
import { authApi } from '../api/authApi';

vi.mock('../api/authApi', () => ({ authApi: { inscrireClient: vi.fn(), inscrireLivreur: vi.fn() } }));

const afficher = (url = '/inscription') => render(<MemoryRouter initialEntries={[url]}><Inscription /></MemoryRouter>);

async function remplirClient(u) {
  await u.type(screen.getByLabelText(/^Prénom/), 'Awa');
  await u.type(screen.getByLabelText(/^Nom/), 'Ndiaye');
  await u.type(screen.getByLabelText(/^Téléphone/), '77 123 45 67');
  await u.type(screen.getByLabelText(/^Adresse e-mail/), 'awa@exemple.sn');
  await u.type(screen.getByLabelText(/^Confirmer l'e-mail/), 'awa@exemple.sn');
  await u.type(screen.getByLabelText(/^Mot de passe/), 'Awa-2026x');
  await u.type(screen.getByLabelText(/^Confirmer le mot de passe/), 'Awa-2026x');
  await u.type(screen.getByLabelText(/^Adresse \*/), 'Sacré-Cœur 3, Dakar');
  await u.click(screen.getByRole('checkbox'));
}

describe('Inscription', () => {
  test('seuls les profils Client et Livreur sont proposés', () => {
    afficher();
    const onglets = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(onglets).toHaveLength(2);
    expect(onglets.join(' ')).not.toMatch(/Administrateur/);
  });

  test('contrôles immédiats : e-mails différents, mot de passe faible, conditions non acceptées', async () => {
    const u = userEvent.setup();
    afficher();
    await u.type(screen.getByLabelText(/^Adresse e-mail/), 'awa@exemple.sn');
    await u.type(screen.getByLabelText(/^Confirmer l'e-mail/), 'autre@exemple.sn');
    await u.type(screen.getByLabelText(/^Mot de passe/), 'court');
    await u.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect(screen.getByText('Les adresses e-mail ne correspondent pas')).toBeInTheDocument();
    expect(screen.getAllByText(/8 caractères minimum/).length).toBeGreaterThan(0);
    expect(screen.getByText(/accepter les conditions/)).toBeInTheDocument();
    expect(authApi.inscrireClient).not.toHaveBeenCalled();
  });

  test('envoie un FormData sans champ « role » et affiche les erreurs renvoyées par le serveur', async () => {
    authApi.inscrireClient.mockRejectedValueOnce({
      response: { status: 409, data: { message: 'Cette adresse e-mail est déjà utilisée', details: [{ champ: 'email', message: 'Déjà utilisée' }] } },
    });
    const u = userEvent.setup();
    afficher();
    await remplirClient(u);
    await u.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    const formulaire = authApi.inscrireClient.mock.calls[0][0];
    expect(formulaire).toBeInstanceOf(FormData);
    expect(formulaire.get('email')).toBe('awa@exemple.sn');
    expect(formulaire.has('role')).toBe(false);
    expect(await screen.findByRole('alert')).toHaveTextContent('Cette adresse e-mail est déjà utilisée');
    expect(screen.getByText('Déjà utilisée')).toBeInTheDocument();
  });

  test('livreur : le permis est exigé sauf pour un vélo', async () => {
    const u = userEvent.setup();
    afficher('/inscription?profil=livreur');
    await u.selectOptions(screen.getByLabelText(/^Type de véhicule/), 'MOTO');
    await u.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect(screen.getByText('Numéro de permis obligatoire pour ce véhicule')).toBeInTheDocument();
    expect(screen.getByText('Photo du permis obligatoire pour ce véhicule')).toBeInTheDocument();
    await u.selectOptions(screen.getByLabelText(/^Type de véhicule/), 'VELO');
    await u.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect(screen.queryByText('Photo du permis obligatoire pour ce véhicule')).not.toBeInTheDocument();
  });
});
