import { describe, expect, test, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModaleConfirmation from '../components/ui/Modale';

function Exemple({ onConfirmer }) {
  const [motif, setMotif] = useState('');
  const [ouverte, setOuverte] = useState(true);
  return (
    <ModaleConfirmation ouverte={ouverte} titre="Annuler ?" onAnnuler={() => setOuverte(false)} onConfirmer={() => onConfirmer(motif)}>
      <label htmlFor="m">Motif</label>
      <textarea id="m" value={motif} onChange={(e) => setMotif(e.target.value)} />
    </ModaleConfirmation>
  );
}

describe('Fenêtre de confirmation', () => {
  test('on peut saisir un texte avec des espaces sans que la fenêtre se ferme (régression)', async () => {
    const onConfirmer = vi.fn();
    const u = userEvent.setup();
    render(<Exemple onConfirmer={onConfirmer} />);
    await u.click(screen.getByLabelText('Motif'));
    await u.keyboard("Le destinataire n'est plus disponible");
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(onConfirmer).toHaveBeenCalledWith("Le destinataire n'est plus disponible");
  });

  test('Échap ferme la fenêtre', async () => {
    const u = userEvent.setup();
    render(<Exemple onConfirmer={() => {}} />);
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
