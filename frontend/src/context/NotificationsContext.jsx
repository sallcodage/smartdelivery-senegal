import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { notificationApi } from '../api/notificationApi';

const NotificationsContext = createContext({ nonLues: 0, rafraichir: () => {} });
const INTERVALLE_MS = 30000;

// Compteur de notifications non lues, actualisé toutes les 30 s et au retour sur l'onglet.
export function NotificationsProvider({ children }) {
  const [nonLues, setNonLues] = useState(0);

  const rafraichir = useCallback(async () => {
    try {
      const { nonLues: total } = await notificationApi.lister({ statut: 'NON_LUE', limite: 1 });
      setNonLues(total);
    } catch { /* compteur conservé en cas d'erreur réseau passagère */ }
  }, []);

  useEffect(() => {
    rafraichir();
    const minuterie = setInterval(rafraichir, INTERVALLE_MS);
    window.addEventListener('focus', rafraichir);
    return () => { clearInterval(minuterie); window.removeEventListener('focus', rafraichir); };
  }, [rafraichir]);

  return <NotificationsContext.Provider value={{ nonLues, rafraichir }}>{children}</NotificationsContext.Provider>;
}

export const useNotifications = () => useContext(NotificationsContext);
