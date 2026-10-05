import { useEffect, useState } from 'react';

// Renvoie la valeur après un délai sans changement (recherche à la frappe)
export function useValeurDifferee(valeur, delaiMs = 400) {
  const [differee, setDifferee] = useState(valeur);
  useEffect(() => {
    const m = setTimeout(() => setDifferee(valeur), delaiMs);
    return () => clearTimeout(m);
  }, [valeur, delaiMs]);
  return differee;
}
