import { useState } from 'react';
import { Ban, CheckCircle2, Pencil, Trash2, UserCheck } from 'lucide-react';
import ModaleConfirmation from '../ui/Modale';
import Fenetre from '../ui/Fenetre';
import FormulaireUtilisateur from './FormulaireUtilisateur';
import { adminApi } from '../../api/adminApi';
import { messageErreur } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// Modifier, activer / suspendre, valider (livreur en attente) ou supprimer un compte
export function useActionsCompte({ onModifie, onSupprime }) {
  const { utilisateur: moi } = useAuth();
  const [cible, setCible] = useState(null); // { action, utilisateur }
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  const ouvrir = (action, utilisateur) => { setErreur(''); setCible({ action, utilisateur }); };
  const fermer = () => !envoi && setCible(null);

  async function confirmer() {
    const { action, utilisateur: u } = cible;
    setEnvoi(true);
    setErreur('');
    try {
      if (action === 'supprimer') { await adminApi.supprimerUtilisateur(u.id); onSupprime?.(u); }
      else onModifie(await adminApi.changerStatut(u.id, action === 'suspendre' ? 'INACTIF' : 'ACTIF'), action);
      setCible(null);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  const TEXTES = {
    valider: { titre: 'Valider ce livreur ?', message: 'Vérifiez ses documents avant de valider : il pourra se connecter et recevoir des livraisons.', bouton: 'Valider le compte', icone: UserCheck, variante: 'primaire' },
    activer: { titre: 'Réactiver ce compte ?', message: "L'utilisateur pourra de nouveau se connecter.", bouton: 'Réactiver', icone: CheckCircle2, variante: 'primaire' },
    suspendre: { titre: 'Suspendre ce compte ?', message: "L'utilisateur sera déconnecté immédiatement et ne pourra plus se connecter. Son historique est conservé.", bouton: 'Suspendre', icone: Ban, variante: 'danger' },
    supprimer: { titre: 'Supprimer définitivement ?', message: "Seuls les comptes sans historique peuvent être supprimés. Sinon, suspendez-le.", bouton: 'Supprimer', icone: Trash2, variante: 'danger' },
  };
  const t = cible && TEXTES[cible.action];

  const rendu = (
    <>
      <ModaleConfirmation
        ouverte={Boolean(cible && cible.action !== 'modifier')} icone={t?.icone} variante={t?.variante} titre={t?.titre}
        message={cible && `${cible.utilisateur.prenom} ${cible.utilisateur.nom} · ${t?.message}`} libelleConfirmer={t?.bouton}
        chargement={envoi} onAnnuler={fermer} onConfirmer={confirmer}
      >
        {erreur && <p className="text-center text-sm text-red-600">{erreur}</p>}
      </ModaleConfirmation>
      <Fenetre ouverte={cible?.action === 'modifier'} titre="Modifier le compte" onFermer={fermer}>
        {cible?.action === 'modifier' && (
          <FormulaireUtilisateur utilisateur={cible.utilisateur} onAnnuler={fermer} onEnregistre={(u) => { setCible(null); onModifie(u, 'modifier'); }} />
        )}
      </Fenetre>
    </>
  );
  return { ouvrir, rendu, moi };
}

// Boutons d'action d'une ligne de tableau
export function BoutonsCompte({ utilisateur: u, ouvrir, moi, supprimer = true }) {
  const soiMeme = u.id === moi.id;
  const classe = 'rounded-lg p-2 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30';
  return (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <button type="button" className={`${classe} text-slate-600`} onClick={() => ouvrir('modifier', u)} aria-label={`Modifier ${u.prenom} ${u.nom}`} title="Modifier"><Pencil className="h-4 w-4" /></button>
      {u.statutCompte === 'EN_ATTENTE' && <button type="button" className={`${classe} text-vert-600`} onClick={() => ouvrir('valider', u)} aria-label={`Valider ${u.prenom} ${u.nom}`} title="Valider le compte"><UserCheck className="h-4 w-4" /></button>}
      {u.statutCompte === 'ACTIF' && <button type="button" disabled={soiMeme} className={`${classe} text-amber-600`} onClick={() => ouvrir('suspendre', u)} aria-label={`Suspendre ${u.prenom} ${u.nom}`} title="Suspendre"><Ban className="h-4 w-4" /></button>}
      {u.statutCompte === 'INACTIF' && <button type="button" className={`${classe} text-vert-600`} onClick={() => ouvrir('activer', u)} aria-label={`Réactiver ${u.prenom} ${u.nom}`} title="Réactiver"><CheckCircle2 className="h-4 w-4" /></button>}
      {supprimer && <button type="button" disabled={soiMeme} className={`${classe} text-red-600`} onClick={() => ouvrir('supprimer', u)} aria-label={`Supprimer ${u.prenom} ${u.nom}`} title="Supprimer"><Trash2 className="h-4 w-4" /></button>}
    </div>
  );
}
