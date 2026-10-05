import api from './client';

export const profilApi = {
  obtenir: () => api.get('/profil').then((r) => r.data.utilisateur),
  modifier: (donnees) => api.patch('/profil', donnees).then((r) => r.data.utilisateur),
  changerPhoto: (fichier) => {
    const formulaire = new FormData();
    formulaire.append('photo', fichier);
    return api.put('/profil/photo', formulaire).then((r) => r.data.utilisateur);
  },
  changerMotDePasse: (donnees) => api.patch('/profil/mot-de-passe', donnees).then((r) => r.data),
};
