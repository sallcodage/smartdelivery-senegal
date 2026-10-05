import api from './client';

export const livreurApi = {
  changerDisponibilite: (disponibilite) => api.patch('/livreurs/moi/disponibilite', { disponibilite }).then((r) => r.data),
  position: (latitude, longitude) => api.patch('/livreurs/moi/position', { latitude, longitude }).then((r) => r.data.position),
  performances: (periode) => api.get('/livreurs/moi/performances', { params: { periode } }).then((r) => r.data.performances),
};
