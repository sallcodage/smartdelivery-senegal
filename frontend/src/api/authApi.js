import api from './client';

export const authApi = {
  connexion: (email, motDePasse) => api.post('/auth/connexion', { email, motDePasse }).then((r) => r.data),
  moi: () => api.get('/auth/moi').then((r) => r.data.utilisateur),
  deconnexion: () => api.post('/auth/deconnexion'),
  // formulaire = FormData (champs + photos)
  inscrireClient: (formulaire) => api.post('/auth/inscription/client', formulaire).then((r) => r.data),
  inscrireLivreur: (formulaire) => api.post('/auth/inscription/livreur', formulaire).then((r) => r.data),
  motDePasseOublie: (email) => api.post('/auth/mot-de-passe-oublie', { email }).then((r) => r.data),
  reinitialiser: (donnees) => api.post('/auth/reinitialiser-mot-de-passe', donnees).then((r) => r.data),
};
