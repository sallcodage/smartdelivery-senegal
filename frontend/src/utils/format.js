const formateurDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formateurHeure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

export const formaterDate = (d) => (d ? formateurDate.format(new Date(d)) : '');
export const formaterDateHeure = (d) => (d ? `${formateurDate.format(new Date(d))} à ${formateurHeure.format(new Date(d))}` : '');

// « il y a 5 min », « hier »…
export function formaterRelatif(d) {
  const secondes = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (secondes < 60) return "à l'instant";
  const minutes = Math.round(secondes / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  if (jours === 1) return 'hier';
  if (jours < 7) return `il y a ${jours} jours`;
  return formaterDate(d);
}

export const formaterFCFA = (n) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;

export const initiales = (u) => `${u?.prenom?.[0] || ''}${u?.nom?.[0] || ''}`.toUpperCase();
