import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CHEMIN_COMMANDE } from '../../config/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { Alerte, Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete, EtatVide } from '../../components/ui/Etats';
import Bouton from '../../components/ui/Bouton';
import { useRequete } from '../../hooks/useRequete';
import { notificationApi } from '../../api/notificationApi';
import { messageErreur } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';
import { formaterDateHeure, formaterRelatif } from '../../utils/format';

const PAR_PAGE = 20;

export default function Notifications() {
  const [filtre, setFiltre] = useState('');
  const [limite, setLimite] = useState(PAR_PAGE);
  const [erreurAction, setErreurAction] = useState('');
  const { rafraichir } = useNotifications();
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const lienCommande = CHEMIN_COMMANDE[utilisateur.role];
  const requete = useRequete(() => notificationApi.lister({ statut: filtre || undefined, limite }), [filtre, limite]);

  async function agir(action) {
    setErreurAction('');
    try {
      await action();
      await Promise.all([requete.recharger(true), rafraichir()]);
    } catch (err) {
      setErreurAction(messageErreur(err));
    }
  }

  const onglets = [{ valeur: '', libelle: 'Toutes' }, { valeur: 'NON_LUE', libelle: 'Non lues' }];
  return (
    <>
      <EnTetePage
        titre="Notifications"
        sousTitre={requete.donnees ? `${requete.donnees.nonLues} non lue(s)` : ' '}
        actions={<Bouton variante="secondaire" icone={CheckCheck} disabled={!requete.donnees?.nonLues} onClick={() => agir(notificationApi.marquerToutesLues)}>Tout marquer comme lu</Bouton>}
      />
      <div className="mb-4 flex gap-2" role="tablist">
        {onglets.map((o) => (
          <button
            key={o.valeur} type="button" role="tab" aria-selected={filtre === o.valeur}
            onClick={() => { setFiltre(o.valeur); setLimite(PAR_PAGE); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${filtre === o.valeur ? 'bg-vert-500 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
          >
            {o.libelle}
          </button>
        ))}
      </div>
      {erreurAction && <div className="mb-4"><Alerte type="erreur">{erreurAction}</Alerte></div>}
      <Carte>
        <EtatsRequete
          requete={requete}
          estVide={(d) => d.donnees.length === 0}
          vide={<EtatVide icone={Bell} titre="Aucune notification" texte={filtre ? 'Toutes vos notifications sont lues.' : 'Les événements de vos commandes apparaîtront ici.'} />}
        >
          {(d) => (
            <>
              <ul className="divide-y divide-slate-100">
                {d.donnees.map((n) => {
                  const nonLue = n.statut === 'NON_LUE';
                  const cible = n.commandeId && lienCommande ? lienCommande(n.commandeId) : null;
                  const ouvrir = async () => {
                    if (nonLue) await agir(() => notificationApi.marquerLue(n.id));
                    if (cible) navigate(cible);
                  };
                  return (
                    <li key={n.id}>
                      <button
                        type="button" disabled={!nonLue && !cible} onClick={ouvrir}
                        className={`flex w-full items-start gap-3 px-4 py-4 text-left sm:px-6 ${nonLue ? 'bg-vert-50/40 hover:bg-vert-50' : cible ? 'hover:bg-slate-50' : 'cursor-default'}`}
                        title={cible ? 'Voir la commande' : nonLue ? 'Marquer comme lue' : undefined}
                      >
                        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${nonLue ? 'bg-vert-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <Bell className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm ${nonLue ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{n.message}</span>
                          <span className="mt-1 block text-xs text-slate-500" title={formaterDateHeure(n.dateCreation)}>
                            {formaterRelatif(n.dateCreation)}{n.commandeNumero && ` · ${n.commandeNumero}`}
                          </span>
                        </span>
                        {nonLue && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-vert-500" aria-label="Non lue" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {d.pagination.total > d.donnees.length && (
                <div className="border-t border-slate-100 p-4 text-center">
                  <Bouton variante="secondaire" taille="sm" chargement={requete.chargement} onClick={() => setLimite((l) => l + PAR_PAGE)}>Voir plus</Bouton>
                </div>
              )}
            </>
          )}
        </EtatsRequete>
      </Carte>
    </>
  );
}
