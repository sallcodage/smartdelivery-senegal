import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Alerte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete } from '../../components/ui/Etats';
import FormulaireCommande from '../../components/commandes/FormulaireCommande';
import { useRequete } from '../../hooks/useRequete';
import { commandeApi } from '../../api/commandeApi';
import { libelleStatut } from '../../components/commandes/StatutCommande';

export default function ModifierCommande() {
  const { id } = useParams();
  const navigate = useNavigate();
  const requete = useRequete(() => commandeApi.obtenir(id), [id]);

  async function enregistrer(donnees) {
    const commande = await commandeApi.modifier(id, donnees);
    navigate(`/client/commandes/${id}`, { state: { message: `Commande ${commande.numero} modifiée. Nouveau prix : ${commande.montant.toLocaleString('fr-FR')} FCFA.` } });
  }

  return (
    <>
      <Link to={`/client/commandes/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-vert-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à la commande
      </Link>
      <EtatsRequete requete={requete}>
        {(c) => (
          <>
            <EnTetePage titre={`Modifier ${c.numero}`} sousTitre="Le prix sera recalculé selon le nouveau trajet." />
            {c.statut === 'NOUVELLE'
              ? <FormulaireCommande commande={c} libelleBouton="Enregistrer les modifications" onSoumettre={enregistrer} />
              : <Alerte type="avertissement">Cette commande n'est plus modifiable (statut « {libelleStatut(c.statut)} »).</Alerte>}
          </>
        )}
      </EtatsRequete>
    </>
  );
}
