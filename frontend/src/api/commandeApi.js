import api from './client';

export const commandeApi = {
  lister: (params) => api.get('/commandes', { params }).then((r) => r.data),
  obtenir: (id) => api.get(`/commandes/${id}`).then((r) => r.data.commande),
  creer: (donnees) => api.post('/commandes', donnees).then((r) => r.data.commande),
  modifier: (id, donnees) => api.patch(`/commandes/${id}`, donnees).then((r) => r.data.commande),
  annuler: (id, motif) => api.post(`/commandes/${id}/annuler`, motif ? { motif } : {}).then((r) => r.data.commande),
  confirmer: (id, note) => api.post(`/commandes/${id}/confirmer`, note ? { note } : {}).then((r) => r.data.commande),
  estimer: (coordonnees) => api.post('/tarification/estimation', coordonnees).then((r) => r.data.estimation),
};

// Actions du livreur
export const livraisonApi = {
  accepter: (id) => api.post(`/commandes/${id}/accepter`).then((r) => r.data.commande),
  refuser: (id, motif) => api.post(`/commandes/${id}/refuser`, { motif }).then((r) => r.data),
  demarrer: (id) => api.post(`/commandes/${id}/demarrer`).then((r) => r.data.commande),
  terminer: (id) => api.post(`/commandes/${id}/terminer`).then((r) => r.data.commande),
  envoyerPosition: (id, latitude, longitude) => api.post(`/commandes/${id}/positions`, { latitude, longitude }).then((r) => r.data.position),
  suivi: (id) => api.get(`/commandes/${id}/suivi`).then((r) => r.data),
};
