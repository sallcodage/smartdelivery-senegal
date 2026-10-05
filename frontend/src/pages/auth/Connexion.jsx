import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, UserPlus } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import { MarqueEmpilee } from '../../components/ui/LogoEmbleme';
import Bouton from '../../components/ui/Bouton';
import { Champ, ChampMotDePasse, CaseACocher } from '../../components/ui/Champ';
import { Alerte } from '../../components/ui/Divers';
import { useAuth } from '../../context/AuthContext';
import { messageErreur } from '../../api/client';
import { cheminAccueil } from '../../config/roles';

export default function Connexion() {
  const { connexion, annonce } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState(state?.email || '');
  const [motDePasse, setMotDePasse] = useState('');
  const [memoriser, setMemoriser] = useState(false); // décoché par défaut (ordinateurs partagés)
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  async function soumettre(e) {
    e.preventDefault();
    if (!email.trim() || !motDePasse) { setErreur('Saisissez votre adresse e-mail et votre mot de passe.'); return; }
    setErreur('');
    setEnvoi(true);
    try {
      const utilisateur = await connexion(email.trim(), motDePasse, memoriser);
      const accueil = cheminAccueil(utilisateur.role);
      // Retour à la page demandée seulement si elle appartient à l'espace de l'utilisateur
      navigate(state?.depuis?.startsWith(accueil) ? state.depuis : accueil, { replace: true });
    } catch (err) {
      setErreur(messageErreur(err));
      setEnvoi(false);
    }
  }

  return (
    <AuthLayout variante="connexion">
      <div className="mb-8 flex flex-col items-center text-center">
        <MarqueEmpilee />
        <h1 className="mt-6 text-[2rem] font-extrabold leading-tight text-marine-900 xl:text-[2.3rem]">Connexion</h1>
        <p className="mt-2 text-[15px] text-slate-600 xl:text-[17px]">Connectez-vous à votre compte SmartDelivery</p>
      </div>

      <form onSubmit={soumettre} className="space-y-5" noValidate>
        {state?.message && <Alerte type="succes">{state.message}</Alerte>}
        {annonce && !erreur && !state?.message && <Alerte type={annonce.type}>{annonce.texte}</Alerte>}
        {erreur && <Alerte type="erreur">{erreur}</Alerte>}

        <Champ
          label="Adresse e-mail" type="email" icone={Mail} autoComplete="email" grand aria-required="true"
          placeholder="Entrez votre adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <ChampMotDePasse
          icone={Lock} autoComplete="current-password" grand aria-required="true" placeholder="Entrez votre mot de passe"
          value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
        />
        <div className="flex items-center justify-between gap-3">
          <CaseACocher label="Se souvenir de moi" checked={memoriser} onChange={(e) => setMemoriser(e.target.checked)} />
          <Link to="/mot-de-passe-oublie" className="text-sm font-medium text-vert-600 hover:underline">Mot de passe oublié ?</Link>
        </div>
        <Bouton type="submit" pleineLargeur taille="lg" chargement={envoi} className="h-14 rounded-xl text-base xl:h-16 xl:text-lg">
          Se connecter {!envoi && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
        </Bouton>
      </form>

      <div className="mt-8 flex items-center gap-4 text-[15px] text-slate-600 xl:text-base">
        <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
        Pas encore de compte ?
        <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
      </div>
      <Link
        to="/inscription"
        className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-xl border-2 border-vert-500 text-base font-semibold xl:h-16 xl:text-lg text-vert-600 transition hover:bg-vert-50 focus:outline-none focus-visible:ring-3 focus-visible:ring-vert-100"
      >
        <UserPlus className="h-5 w-5" aria-hidden="true" /> Créer un compte
      </Link>
    </AuthLayout>
  );
}
