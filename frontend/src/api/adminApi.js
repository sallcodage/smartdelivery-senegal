import api from './client';

export const adminApi = {
  kpi: (periode) => api.get('/admin/kpi', { params: { periode } }).then((r) => r.data),
  // Utilisateurs
  utilisateurs: (params) => api.get('/admin/utilisateurs', { params }).then((r) => r.data),
  utilisateur: (id) => api.get(`/admin/utilisateurs/${id}`).then((r) => r.data.utilisateur),
  creerUtilisateur: (d) => api.post('/admin/utilisateurs', d).then((r) => r.data.utilisateur),
  modifierUtilisateur: (id, d) => api.patch(`/admin/utilisateurs/${id}`, d).then((r) => r.data.utilisateur),
  changerStatut: (id, statut) => api.patch(`/admin/utilisateurs/${id}/statut`, { statut }).then((r) => r.data.utilisateur),
  supprimerUtilisateur: (id) => api.delete(`/admin/utilisateurs/${id}`),
  clients: (params) => api.get('/admin/clients', { params }).then((r) => r.data),
  livreurs: (params) => api.get('/admin/livreurs', { params }).then((r) => r.data.livreurs),
  performancesLivreur: (id, periode) => api.get(`/admin/livreurs/${id}/performances`, { params: { periode } }).then((r) => r.data.performances),
  // Commandes et livraisons
  compteursCommandes: () => api.get('/admin/commandes/compteurs').then((r) => r.data),
  livraisonsActives: () => api.get('/admin/livraisons/actives').then((r) => r.data.livraisons),
  valider: (id) => api.post(`/commandes/${id}/valider`).then((r) => r.data.commande),
  affecter: (id, choix) => api.post(`/commandes/${id}/affecter`, choix).then((r) => r.data.commande),
  annuler: (id, motif) => api.post(`/commandes/${id}/annuler`, motif ? { motif } : {}).then((r) => r.data.commande),
  async exporterCommandes(params) {
    const reponse = await api.get('/admin/commandes/export', { params, responseType: 'blob' });
    const nom = /filename="([^"]+)"/.exec(reponse.headers['content-disposition'] || '')?.[1] || 'commandes.csv';
    const lien = document.createElement('a');
    lien.href = URL.createObjectURL(reponse.data);
    lien.download = nom;
    lien.click();
    URL.revokeObjectURL(lien.href);
  },
  // Rapports PDF
  rapports: (params) => api.get('/admin/rapports', { params }).then((r) => r.data),
  rapport: (id) => api.get(`/admin/rapports/${id}`).then((r) => r.data.rapport),
  genererRapport: (d) => api.post('/admin/rapports', d).then((r) => r.data.rapport),
  // Le PDF est protégé par le jeton : on le récupère en blob puis on crée une URL locale
  pdfRapport: (id) => api.get(`/admin/rapports/${id}/pdf`, { responseType: 'blob' }).then((r) => URL.createObjectURL(r.data)),
  async telechargerRapport(rapport) {
    const url = await adminApi.pdfRapport(rapport.id);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = rapport.nomFichier;
    lien.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  // Tarification
  tarification: () => api.get('/tarification').then((r) => r.data.parametres),
  simulerTarification: (d) => api.post('/admin/tarification/simulation', d).then((r) => r.data.exemples),
  modifierTarification: (d) => api.put('/admin/tarification', d).then((r) => r.data.parametres),
};
