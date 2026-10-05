import { Link } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import Bouton from '../../components/ui/Bouton';
import { useAuth } from '../../context/AuthContext';
import { cheminAccueil } from '../../config/roles';

export default function PageIntrouvable() {
  const { utilisateur } = useAuth();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-fond px-4 text-center">
      <MapPinOff className="h-14 w-14 text-vert-500" aria-hidden="true" />
      <h1 className="text-2xl font-bold text-slate-900">Page introuvable</h1>
      <p className="max-w-sm text-slate-500">Cette adresse ne correspond à aucune page de SmartDelivery.</p>
      <Link to={utilisateur ? cheminAccueil(utilisateur.role) : '/connexion'} className="mt-3"><Bouton>Revenir à l'accueil</Bouton></Link>
    </main>
  );
}
