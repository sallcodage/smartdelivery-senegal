import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bike, CheckCircle2, CreditCard, IdCard, Lock, LogIn, Mail, MapPin, Package, Phone, User, UserPlus } from 'lucide-react';
import { MarqueEmpilee } from '../../components/ui/LogoEmbleme';
import AuthLayout from '../../layouts/AuthLayout';
import Bouton from '../../components/ui/Bouton';
import { Champ, ChampMotDePasse, ChampSelect, CaseACocher } from '../../components/ui/Champ';
import ChampPhoto from '../../components/ui/ChampPhoto';
import { Alerte } from '../../components/ui/Divers';
import { authApi } from '../../api/authApi';
import { erreursDesChamps, messageErreur } from '../../api/client';
import { VEHICULES } from '../../config/roles';

// Pas d'onglet « Administrateur » : ce rôle n'est jamais attribué par un formulaire public.
const PROFILS = [
  { valeur: 'CLIENT', titre: 'Client', texte: 'Envoyer et recevoir des colis', icone: Package },
  { valeur: 'LIVREUR', titre: 'Livreur', texte: 'Livrer des colis', icone: Bike },
];

const VIDE = {
  prenom: '', nom: '', telephone: '', email: '', confirmationEmail: '', motDePasse: '',
  confirmationMotDePasse: '', adresse: '', vehicule: '', numeroPermis: '', cgu: false,
};

function validerLocalement(f, profil, photos) {
  const e = {};
  const requis = ['prenom', 'nom', 'telephone', 'email', 'motDePasse'];
  if (profil === 'CLIENT') requis.push('adresse');
  if (profil === 'LIVREUR') requis.push('vehicule');
  requis.forEach((c) => { if (!String(f[c]).trim()) e[c] = 'Champ obligatoire'; });
  if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = 'Adresse e-mail invalide';
  if (f.email.trim().toLowerCase() !== f.confirmationEmail.trim().toLowerCase()) e.confirmationEmail = 'Les adresses e-mail ne correspondent pas';
  if (f.telephone && !/^\+?[0-9]{9,15}$/.test(f.telephone.replace(/[\s.-]/g, ''))) e.telephone = 'Numéro invalide (ex. 77 123 45 67)';
  if (f.motDePasse && !(f.motDePasse.length >= 8 && /[A-Za-z]/.test(f.motDePasse) && /\d/.test(f.motDePasse))) {
    e.motDePasse = '8 caractères minimum, dont une lettre et un chiffre';
  }
  if (f.motDePasse !== f.confirmationMotDePasse) e.confirmationMotDePasse = 'Les mots de passe ne correspondent pas';
  if (profil === 'LIVREUR' && f.vehicule && f.vehicule !== 'VELO') {
    if (!f.numeroPermis.trim()) e.numeroPermis = 'Numéro de permis obligatoire pour ce véhicule';
    if (!photos.photoPermis) e.photoPermis = 'Photo du permis obligatoire pour ce véhicule';
  }
  if (!f.cgu) e.cgu = 'Vous devez accepter les conditions pour créer un compte';
  return e;
}

export default function Inscription() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const profil = params.get('profil') === 'livreur' ? 'LIVREUR' : 'CLIENT';
  const [f, setF] = useState(VIDE);
  const [photos, setPhotos] = useState({ photo: null, photoPermis: null, photoVehicule: null });
  const [erreurs, setErreurs] = useState({});
  const [erreurGlobale, setErreurGlobale] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [livreurInscrit, setLivreurInscrit] = useState(false);

  const changer = (e) => {
    const { name, value, type, checked } = e.target;
    setF((a) => ({ ...a, [name]: type === 'checkbox' ? checked : value }));
    setErreurs((a) => ({ ...a, [name]: undefined }));
  };
  const changerPhoto = (champ) => (fichier) => {
    setPhotos((p) => ({ ...p, [champ]: fichier }));
    setErreurs((a) => ({ ...a, [champ]: undefined }));
  };
  const choisirProfil = (valeur) => {
    setParams(valeur === 'LIVREUR' ? { profil: 'livreur' } : {});
    setErreurs({});
    setErreurGlobale('');
  };

  async function soumettre(e) {
    e.preventDefault();
    const locales = validerLocalement(f, profil, photos);
    setErreurs(locales);
    setErreurGlobale('');
    if (Object.keys(locales).length) return;

    const formulaire = new FormData();
    const champs = ['prenom', 'nom', 'telephone', 'email', 'motDePasse', 'confirmationMotDePasse'];
    champs.push(...(profil === 'CLIENT' ? ['adresse'] : ['vehicule', 'numeroPermis']));
    champs.forEach((c) => formulaire.append(c, f[c].trim ? f[c].trim() : f[c]));
    Object.entries(photos).forEach(([c, fichier]) => fichier && formulaire.append(c, fichier));

    setEnvoi(true);
    try {
      if (profil === 'CLIENT') {
        await authApi.inscrireClient(formulaire);
        navigate('/connexion', { state: { message: 'Compte créé avec succès. Connectez-vous pour continuer.', email: f.email.trim() } });
      } else {
        await authApi.inscrireLivreur(formulaire);
        setLivreurInscrit(true);
      }
    } catch (err) {
      setErreurs(erreursDesChamps(err));
      setErreurGlobale(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  if (livreurInscrit) {
    return (
      <AuthLayout variante="inscription">
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-16 w-16 text-vert-500" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Inscription envoyée</h1>
          <p className="mt-2 max-w-md text-slate-600">
            Votre compte livreur sera activé après la vérification de vos documents par un administrateur.
            Vous pourrez ensuite vous connecter avec votre adresse e-mail.
          </p>
          <Link to="/connexion" className="mt-6"><Bouton>Retour à la connexion</Bouton></Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout variante="inscription">
      <div className="mb-7 flex flex-col items-center text-center">
        <MarqueEmpilee />
        <h1 className="mt-5 text-[2rem] font-extrabold leading-tight text-marine-900">{profil === 'CLIENT' ? 'Créer un compte' : 'Créer un compte livreur'}</h1>
        <p className="mt-2 text-[15px] text-slate-600">Rejoignez SmartDelivery Sénégal</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3" role="tablist" aria-label="Type de compte">
        {PROFILS.map(({ valeur, titre, texte, icone: Icone }) => {
          const actif = profil === valeur;
          return (
            <button
              key={valeur} type="button" role="tab" aria-selected={actif} onClick={() => choisirProfil(valeur)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${actif
                ? 'border-vert-500 bg-vert-500 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-vert-300'}`}
            >
              <Icone className="h-6 w-6 shrink-0" aria-hidden="true" />
              <span>
                <span className="block text-sm font-semibold">{titre}</span>
                <span className={`block text-xs ${actif ? 'text-white' : 'text-slate-500'}`}>{texte}</span>
              </span>
            </button>
          );
        })}
      </div>

      <form onSubmit={soumettre} noValidate className="space-y-4">
        {erreurGlobale && <Alerte type="erreur">{erreurGlobale}</Alerte>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Prénom" name="prenom" icone={User} requis autoComplete="given-name" placeholder="Votre prénom" value={f.prenom} onChange={changer} erreur={erreurs.prenom} />
          <Champ label="Nom" name="nom" icone={User} requis autoComplete="family-name" placeholder="Votre nom" value={f.nom} onChange={changer} erreur={erreurs.nom} />
          <Champ label="Téléphone" name="telephone" type="tel" icone={Phone} requis autoComplete="tel" placeholder="77 123 45 67" value={f.telephone} onChange={changer} erreur={erreurs.telephone} />
          <Champ label="Adresse e-mail" name="email" type="email" icone={Mail} requis autoComplete="email" placeholder="exemple@email.sn" value={f.email} onChange={changer} erreur={erreurs.email} />
          <Champ label="Confirmer l'e-mail" name="confirmationEmail" type="email" icone={Mail} requis autoComplete="off" placeholder="Confirmez votre e-mail" value={f.confirmationEmail} onChange={changer} erreur={erreurs.confirmationEmail} onPaste={(e) => e.preventDefault()} />
          <ChampMotDePasse label="Mot de passe" name="motDePasse" icone={Lock} requis autoComplete="new-password" placeholder="Créez un mot de passe" aide="8 caractères minimum, dont une lettre et un chiffre" value={f.motDePasse} onChange={changer} erreur={erreurs.motDePasse} />
          <ChampMotDePasse label="Confirmer le mot de passe" name="confirmationMotDePasse" icone={Lock} requis autoComplete="new-password" placeholder="Confirmez le mot de passe" value={f.confirmationMotDePasse} onChange={changer} erreur={erreurs.confirmationMotDePasse} />

          {profil === 'CLIENT' ? (
            <div className="sm:col-span-2">
              <Champ label="Adresse" name="adresse" icone={MapPin} requis autoComplete="street-address" placeholder="Quartier, rue, ville (ex. Sacré-Cœur 3, Dakar)" value={f.adresse} onChange={changer} erreur={erreurs.adresse} />
            </div>
          ) : (
            <>
              <ChampSelect label="Type de véhicule" name="vehicule" icone={Bike} requis placeholder="Sélectionner" options={VEHICULES} value={f.vehicule} onChange={changer} erreur={erreurs.vehicule} />
              <Champ label="Numéro de permis" name="numeroPermis" icone={IdCard} requis={f.vehicule !== 'VELO'} placeholder={f.vehicule === 'VELO' ? 'Non requis pour un vélo' : 'Numéro du permis de conduire'} value={f.numeroPermis} onChange={changer} erreur={erreurs.numeroPermis} disabled={f.vehicule === 'VELO'} />
            </>
          )}
        </div>

        <div className={`grid gap-4 ${profil === 'LIVREUR' ? 'sm:grid-cols-2' : ''}`}>
          {profil === 'LIVREUR' && (
            <ChampPhoto label="Photo du permis" icone={CreditCard} optionnel={f.vehicule === 'VELO'} fichier={photos.photoPermis} onChange={changerPhoto('photoPermis')} erreur={erreurs.photoPermis} />
          )}
          <ChampPhoto label="Photo de profil" optionnel fichier={photos.photo} onChange={changerPhoto('photo')} erreur={erreurs.photo} />
          {profil === 'LIVREUR' && (
            <ChampPhoto label="Photo du véhicule" icone={Bike} optionnel fichier={photos.photoVehicule} onChange={changerPhoto('photoVehicule')} erreur={erreurs.photoVehicule} />
          )}
        </div>

        <CaseACocher
          name="cgu" checked={f.cgu} onChange={changer} erreur={erreurs.cgu}
          label={<>J'accepte les <Link to="/conditions" target="_blank" className="font-medium text-vert-600 underline">conditions d'utilisation</Link> et la <Link to="/confidentialite" target="_blank" className="font-medium text-vert-600 underline">politique de confidentialité</Link></>}
        />
        <Bouton type="submit" pleineLargeur taille="lg" chargement={envoi} className="h-14 rounded-xl text-base">
          {!envoi && <UserPlus className="h-5 w-5" aria-hidden="true" />} Créer mon compte
        </Bouton>
      </form>

      <div className="mt-8 flex items-center gap-4 text-[15px] text-slate-600">
        <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
        Vous avez déjà un compte ?
        <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
      </div>
      <Link
        to="/connexion"
        className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-xl border-2 border-vert-500 text-base font-semibold text-vert-600 transition hover:bg-vert-50 focus:outline-none focus-visible:ring-3 focus-visible:ring-vert-100"
      >
        <LogIn className="h-5 w-5" aria-hidden="true" /> Se connecter
      </Link>
    </AuthLayout>
  );
}
