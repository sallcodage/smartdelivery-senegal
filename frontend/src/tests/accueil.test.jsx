import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Accueil from '../pages/public/Accueil';

const afficher = () => render(<MemoryRouter><Accueil /></MemoryRouter>);

describe('Page d\'accueil publique', () => {
  test('la barre de navigation contient les six entrées demandées', () => {
    afficher();
    const nav = within(screen.getByRole('navigation', { name: 'Navigation principale' }));
    for (const libelle of ['Accueil', 'Services', 'Comment ça marche', 'À propos']) {
      expect(nav.getByRole('link', { name: libelle })).toHaveAttribute('href', expect.stringContaining('#'));
    }
    expect(nav.getByRole('link', { name: 'Connexion' })).toHaveAttribute('href', '/connexion');
    expect(nav.getByRole('link', { name: 'Inscription' })).toHaveAttribute('href', '/inscription');
  });

  test('les boutons principaux mènent à la connexion', () => {
    afficher();
    const commander = screen.getAllByRole('link', { name: /Commander une livraison/ });
    expect(commander[0]).toHaveAttribute('href', '/connexion');
    expect(screen.getAllByRole('link', { name: 'Se connecter' })[0]).toHaveAttribute('href', '/connexion');
  });

  test('les sections et le pied de page sont présents', () => {
    afficher();
    for (const id of ['accueil', 'services', 'fonctionnement', 'a-propos']) expect(document.getElementById(id)).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Votre livraison en trois étapes' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Conditions d\'utilisation');
  });
});
