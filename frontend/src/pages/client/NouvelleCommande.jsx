import { useNavigate } from 'react-router-dom';
import { EnTetePage } from '../../components/ui/Divers';
import FormulaireCommande from '../../components/commandes/FormulaireCommande';
import { commandeApi } from '../../api/commandeApi';
import { useNotifications } from '../../context/NotificationsContext';

export default function NouvelleCommande() {
  const navigate = useNavigate();
  const { rafraichir } = useNotifications();
  async function creer(donnees) {
    const commande = await commandeApi.creer(donnees);
    rafraichir();
    navigate(`/client/commandes/${commande.id}`, { state: { message: `Commande ${commande.numero} enregistrée. Elle sera validée par notre équipe.` } });
  }
  return (
    <>
      <EnTetePage titre="Nouvelle commande" sousTitre="Indiquez le trajet et le colis : le prix est calculé automatiquement." />
      <FormulaireCommande libelleBouton="Valider la commande" onSoumettre={creer} />
    </>
  );
}
