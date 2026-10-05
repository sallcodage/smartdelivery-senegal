import { LocateFixed, LocateOff, Loader2 } from 'lucide-react';
import { usePositionLivreur } from '../../context/PositionLivreurContext';
import { formaterRelatif } from '../../utils/format';

// Pastille d'état du partage de position (en-tête / bandeau)
export default function IndicateurPosition({ surFondVert = false }) {
  const position = usePositionLivreur();
  if (!position?.mode) return null;
  const { statut, dernierEnvoi, erreur, simulation } = position;
  const ok = statut === 'actif' && !erreur;
  const Icone = ok ? LocateFixed : statut === 'attente' ? Loader2 : LocateOff;
  const texte = simulation ? 'Trajet simulé en cours'
    : ok ? `Position partagée${dernierEnvoi ? ` · ${formaterRelatif(dernierEnvoi)}` : ''}`
      : statut === 'attente' ? 'Recherche du GPS…' : erreur || 'Position non partagée';
  const couleur = surFondVert
    ? 'bg-nuit-900/25 text-white'
    : ok || simulation ? 'bg-vert-50 text-vert-700' : 'bg-amber-50 text-amber-800';
  return (
    <p className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${couleur}`} role="status">
      <Icone className={`h-3.5 w-3.5 ${statut === 'attente' ? 'animate-spin' : ''}`} aria-hidden="true" /> {texte}
    </p>
  );
}
