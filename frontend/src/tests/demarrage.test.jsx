import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// La vérification de session est simulée : on contrôle « initialisation » d'AuthContext
const etatAuth = { initialisation: false };
vi.mock('../context/AuthContext', () => ({ useAuth: () => etatAuth }));

const { default: Demarrage, DUREE_MINIMALE_MS, DUREE_SORTIE_MS } = await import('../components/demarrage/Demarrage');

const Page = () => <button type="button">Page d'arrivée</button>;
const splash = () => screen.queryByRole('status', { name: 'Chargement de SmartDelivery Sénégal' });

describe('Démarrage (Splash Screen)', () => {
  beforeEach(() => { vi.useFakeTimers(); sessionStorage.clear(); etatAuth.initialisation = false; });
  afterEach(() => vi.useRealTimers());

  test('ouverture : splash pendant 2,5 s (logo, nom, signature), page inaccessible, puis page affichée', () => {
    const { rerender } = render(<Demarrage><Page /></Demarrage>);
    expect(splash()).toBeInTheDocument();
    expect(screen.getByText('Livrer mieux. Suivre simplement.')).toBeInTheDocument();
    expect(screen.getByText('Sénégal')).toBeInTheDocument();
    // La page est préparée dessous mais inerte (ni clic ni focus)
    expect(screen.getByText("Page d'arrivée").closest('[inert]')).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');

    act(() => vi.advanceTimersByTime(DUREE_MINIMALE_MS - 100));
    expect(splash()).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(100));
    expect(splash()).toHaveClass('splash--sortie'); // fondu de sortie
    act(() => vi.advanceTimersByTime(DUREE_SORTIE_MS));
    rerender(<Demarrage><Page /></Demarrage>);
    expect(splash()).toBeNull();
    expect(screen.getByText("Page d'arrivée").closest('[inert]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  test('session en cours de vérification : le splash attend la réponse de l\'API, même après 2,5 s', () => {
    etatAuth.initialisation = true;
    const { rerender } = render(<Demarrage><Page /></Demarrage>);
    act(() => vi.advanceTimersByTime(DUREE_MINIMALE_MS + 2000));
    expect(splash()).toBeInTheDocument();
    expect(splash()).not.toHaveClass('splash--sortie');
    etatAuth.initialisation = false; // réponse de /auth/moi reçue
    rerender(<Demarrage><Page /></Demarrage>);
    expect(splash()).toHaveClass('splash--sortie');
    act(() => vi.advanceTimersByTime(DUREE_SORTIE_MS));
    expect(splash()).toBeNull();
  });

  test('rechargement dans le même onglet : aucune attente imposée', () => {
    sessionStorage.setItem('smartdelivery_splash_vu', '1');
    render(<Demarrage><Page /></Demarrage>);
    expect(splash()).toBeNull();
    expect(screen.getByText("Page d'arrivée").closest('[inert]')).toBeNull();
  });

  test('rechargement avec une session à vérifier : splash le temps de la vérification seulement', () => {
    sessionStorage.setItem('smartdelivery_splash_vu', '1');
    etatAuth.initialisation = true;
    const { rerender } = render(<Demarrage><Page /></Demarrage>);
    expect(splash()).toBeInTheDocument();
    etatAuth.initialisation = false;
    rerender(<Demarrage><Page /></Demarrage>);
    act(() => vi.advanceTimersByTime(DUREE_SORTIE_MS));
    expect(splash()).toBeNull();
  });

  test('la première ouverture est mémorisée pour l\'onglet', () => {
    render(<Demarrage><Page /></Demarrage>);
    expect(sessionStorage.getItem('smartdelivery_splash_vu')).toBeNull();
    act(() => vi.advanceTimersByTime(DUREE_MINIMALE_MS));
    expect(sessionStorage.getItem('smartdelivery_splash_vu')).toBe('1');
  });
});
