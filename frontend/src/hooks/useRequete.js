import { useCallback, useEffect, useRef, useState } from 'react';
import { messageErreur } from '../api/client';

// Appel d'API avec les quatre états : chargement, succès, erreur, (données vides gérées par la page)
export function useRequete(fonction, dependances = []) {
  const [etat, setEtat] = useState({ donnees: null, chargement: true, erreur: '' });
  const fonctionRef = useRef(fonction);
  fonctionRef.current = fonction;

  const charger = useCallback(async (silencieux = false) => {
    if (!silencieux) setEtat((e) => ({ ...e, chargement: true, erreur: '' }));
    try {
      const donnees = await fonctionRef.current();
      setEtat({ donnees, chargement: false, erreur: '' });
    } catch (err) {
      setEtat((e) => ({ ...e, chargement: false, erreur: messageErreur(err) }));
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { charger(); }, dependances);

  return { ...etat, recharger: charger, setDonnees: (d) => setEtat((e) => ({ ...e, donnees: d })) };
}
