import { describe, expect, test } from 'vitest';
import { erreursDesChamps, messageErreur } from '../api/client';

describe('Messages d\'erreur de l\'API', () => {
  test('message du serveur, erreur réseau, délai dépassé', () => {
    expect(messageErreur({ response: { data: { message: 'Commande introuvable' } } })).toBe('Commande introuvable');
    expect(messageErreur({ request: {} })).toMatch(/Impossible de joindre le serveur/);
    expect(messageErreur({ code: 'ECONNABORTED' })).toMatch(/trop de temps/);
  });
  test('détails par champ transformés en objet', () => {
    const err = { response: { data: { details: [{ champ: 'email', message: 'Adresse e-mail invalide' }] } } };
    expect(erreursDesChamps(err)).toEqual({ email: 'Adresse e-mail invalide' });
  });
});
