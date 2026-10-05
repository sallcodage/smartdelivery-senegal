// Stockage du jeton : localStorage si « Se souvenir de moi », sinon sessionStorage (effacé à la fermeture).
const CLE = 'smartdelivery_jeton';

export const lireJeton = () => localStorage.getItem(CLE) || sessionStorage.getItem(CLE);

export function enregistrerJeton(jeton, memoriser) {
  effacerSession();
  (memoriser ? localStorage : sessionStorage).setItem(CLE, jeton);
}

export function effacerSession() {
  localStorage.removeItem(CLE);
  sessionStorage.removeItem(CLE);
}
