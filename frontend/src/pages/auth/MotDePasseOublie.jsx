import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import Logo from '../../components/ui/Logo';
import Bouton from '../../components/ui/Bouton';
import { Champ } from '../../components/ui/Champ';
import { Alerte, Carte } from '../../components/ui/Divers';
import { IllustrationEnveloppe } from '../../assets/Illustrations';
import { authApi } from '../../api/authApi';
import { messageErreur } from '../../api/client';

export function PageCentree({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fond px-4 py-10">
      <Carte className="w-full max-w-md p-8">{children}</Carte>
    </main>
  );
}

export default function MotDePasseOublie() {
  const [email, setEmail] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState('');

  async function soumettre(e) {
    e.preventDefault();
    if (!email.trim()) { setErreur('Saisissez votre adresse e-mail.'); return; }
    setErreur('');
    setEnvoi(true);
    try {
      setResultat(await authApi.motDePasseOublie(email.trim()));
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  // En démonstration, l'API renvoie le lien au lieu de l'envoyer par e-mail
  const lienDemo = resultat?.lienReinitialisation && (() => {
    const url = new URL(resultat.lienReinitialisation);
    return `${url.pathname}${url.search}`;
  })();

  return (
    <PageCentree>
      <div className="flex flex-col items-center text-center">
        <Logo taille="md" />
        <IllustrationEnveloppe className="my-6 h-28" />
        <h1 className="text-2xl font-bold text-slate-900">Mot de passe oublié ?</h1>
        <p className="mt-2 text-sm text-slate-500">Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.</p>
      </div>

      {resultat ? (
        <div className="mt-6 space-y-4">
          <Alerte type="succes">{resultat.message}</Alerte>
          {lienDemo && (
            <Alerte type="info">
              Mode démonstration : aucun e-mail n'est envoyé.{' '}
              <Link to={lienDemo} className="font-semibold underline">Ouvrir le lien de réinitialisation</Link>
            </Alerte>
          )}
        </div>
      ) : (
        <form onSubmit={soumettre} className="mt-6 space-y-4" noValidate>
          {erreur && <Alerte type="erreur">{erreur}</Alerte>}
          <Champ label="Adresse e-mail" type="email" icone={Mail} requis autoComplete="email" placeholder="Entrez votre adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Bouton type="submit" pleineLargeur taille="lg" chargement={envoi}>Envoyer le lien</Bouton>
        </form>
      )}

      <Link to="/connexion" className="mt-6 flex items-center justify-center gap-1 text-sm font-semibold text-vert-600 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à la connexion
      </Link>
    </PageCentree>
  );
}
