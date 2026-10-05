import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Lock } from 'lucide-react';
import Logo from '../../components/ui/Logo';
import Bouton from '../../components/ui/Bouton';
import { ChampMotDePasse } from '../../components/ui/Champ';
import { Alerte } from '../../components/ui/Divers';
import { PageCentree } from './MotDePasseOublie';
import { authApi } from '../../api/authApi';
import { erreursDesChamps, messageErreur } from '../../api/client';

export default function Reinitialisation() {
  const [params] = useSearchParams();
  const jeton = params.get('jeton') || '';
  const navigate = useNavigate();
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreurs, setErreurs] = useState({});
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e) {
    e.preventDefault();
    const locales = {};
    if (!(motDePasse.length >= 8 && /[A-Za-z]/.test(motDePasse) && /\d/.test(motDePasse))) {
      locales.motDePasse = '8 caractères minimum, dont une lettre et un chiffre';
    }
    if (motDePasse !== confirmation) locales.confirmationMotDePasse = 'Les mots de passe ne correspondent pas';
    setErreurs(locales);
    setErreur('');
    if (Object.keys(locales).length) return;
    setEnvoi(true);
    try {
      await authApi.reinitialiser({ jeton, motDePasse, confirmationMotDePasse: confirmation });
      navigate('/connexion', { replace: true, state: { message: 'Mot de passe modifié. Connectez-vous avec votre nouveau mot de passe.' } });
    } catch (err) {
      setErreurs(erreursDesChamps(err));
      setErreur(messageErreur(err));
      setEnvoi(false);
    }
  }

  return (
    <PageCentree>
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo />
        <span className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-vert-50 text-vert-600"><KeyRound className="h-6 w-6" aria-hidden="true" /></span>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Nouveau mot de passe</h1>
      </div>
      {!jeton ? (
        <Alerte type="erreur">Lien incomplet. <Link to="/mot-de-passe-oublie" className="font-semibold underline">Demander un nouveau lien</Link></Alerte>
      ) : (
        <form onSubmit={soumettre} className="space-y-4" noValidate>
          {erreur && <Alerte type="erreur">{erreur}{' '}{/expiré/.test(erreur) && <Link to="/mot-de-passe-oublie" className="font-semibold underline">Demander un nouveau lien</Link>}</Alerte>}
          <ChampMotDePasse label="Nouveau mot de passe" icone={Lock} requis autoComplete="new-password" aide="8 caractères minimum, dont une lettre et un chiffre" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} erreur={erreurs.motDePasse} />
          <ChampMotDePasse label="Confirmer le mot de passe" icone={Lock} requis autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} erreur={erreurs.confirmationMotDePasse} />
          <Bouton type="submit" pleineLargeur taille="lg" chargement={envoi}>Enregistrer le mot de passe</Bouton>
        </form>
      )}
    </PageCentree>
  );
}
