import { useRef, useState } from 'react';
import { Bike, Camera, Lock, Mail, MapPin, Phone, Star, User } from 'lucide-react';
import { Alerte, Avatar, Badge, Carte, EnTetePage } from '../../components/ui/Divers';
import { Champ, ChampMotDePasse, ChampSelect } from '../../components/ui/Champ';
import Bouton from '../../components/ui/Bouton';
import { useAuth } from '../../context/AuthContext';
import { profilApi } from '../../api/profilApi';
import { erreursDesChamps, messageErreur } from '../../api/client';
import { LIBELLES_ROLE, VEHICULES, libelleVehicule } from '../../config/roles';
import { formaterDate } from '../../utils/format';

function CartePhoto() {
  const { utilisateur, setUtilisateur } = useAuth();
  const entree = useRef(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  async function changer(e) {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    if (fichier.size > 2 * 1024 * 1024) { setErreur('Fichier trop volumineux (2 Mo maximum)'); return; }
    setErreur('');
    setEnvoi(true);
    try {
      setUtilisateur(await profilApi.changerPhoto(fichier));
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Carte className="p-6 text-center">
      <div className="relative mx-auto w-fit">
        <Avatar utilisateur={utilisateur} taille="lg" />
        <button
          type="button" onClick={() => entree.current?.click()} disabled={envoi}
          className="absolute bottom-0 right-0 rounded-full bg-vert-500 p-2 text-white shadow hover:bg-vert-600 disabled:opacity-60" aria-label="Changer la photo de profil"
        >
          <Camera className="h-4 w-4" />
        </button>
        <input ref={entree} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={changer} aria-label="Choisir une nouvelle photo de profil" tabIndex={-1} />
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-900">{utilisateur.prenom} {utilisateur.nom}</h2>
      <div className="mt-1"><Badge ton="vert">{LIBELLES_ROLE[utilisateur.role]}</Badge></div>
      {erreur && <div className="mt-3 text-left"><Alerte type="erreur">{erreur}</Alerte></div>}
      <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-left text-sm">
        <div className="flex justify-between gap-2"><dt className="text-slate-500">E-mail</dt><dd className="truncate font-medium text-slate-800">{utilisateur.email}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-slate-500">Membre depuis</dt><dd className="font-medium text-slate-800">{formaterDate(utilisateur.dateCreation)}</dd></div>
        {utilisateur.role === 'LIVREUR' && (
          <>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Véhicule</dt><dd className="font-medium text-slate-800">{libelleVehicule(utilisateur.vehicule)}</dd></div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Note moyenne</dt>
              <dd className="flex items-center gap-1 font-medium text-slate-800">
                {utilisateur.noteMoyenne
                  ? <><Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />{String(utilisateur.noteMoyenne).replace('.', ',')} ({utilisateur.nombreEvaluations})</>
                  : 'Aucune évaluation'}
              </dd>
            </div>
          </>
        )}
      </dl>
    </Carte>
  );
}

function FormulaireInformations() {
  const { utilisateur, setUtilisateur } = useAuth();
  const [f, setF] = useState({
    prenom: utilisateur.prenom, nom: utilisateur.nom, telephone: utilisateur.telephone,
    adresse: utilisateur.adresse || '', vehicule: utilisateur.vehicule || '',
  });
  const [erreurs, setErreurs] = useState({});
  const [message, setMessage] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const changer = (e) => setF((a) => ({ ...a, [e.target.name]: e.target.value }));

  async function soumettre(e) {
    e.preventDefault();
    setMessage(null);
    setErreurs({});
    const donnees = { prenom: f.prenom.trim(), nom: f.nom.trim(), telephone: f.telephone.trim() };
    if (utilisateur.role === 'CLIENT') donnees.adresse = f.adresse.trim();
    if (utilisateur.role === 'LIVREUR') donnees.vehicule = f.vehicule;
    setEnvoi(true);
    try {
      setUtilisateur(await profilApi.modifier(donnees));
      setMessage({ type: 'succes', texte: 'Informations enregistrées.' });
    } catch (err) {
      setErreurs(erreursDesChamps(err));
      setMessage({ type: 'erreur', texte: messageErreur(err) });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Carte className="p-6">
      <h2 className="text-base font-semibold text-slate-900">Informations personnelles</h2>
      <form onSubmit={soumettre} className="mt-4 space-y-4" noValidate>
        {message && <Alerte type={message.type}>{message.texte}</Alerte>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Prénom" name="prenom" icone={User} requis value={f.prenom} onChange={changer} erreur={erreurs.prenom} />
          <Champ label="Nom" name="nom" icone={User} requis value={f.nom} onChange={changer} erreur={erreurs.nom} />
          <Champ label="Téléphone" name="telephone" type="tel" icone={Phone} requis value={f.telephone} onChange={changer} erreur={erreurs.telephone} />
          <Champ label="Adresse e-mail" icone={Mail} value={utilisateur.email} disabled aide="L'adresse e-mail sert d'identifiant et ne peut pas être modifiée." />
          {utilisateur.role === 'CLIENT' && (
            <div className="sm:col-span-2"><Champ label="Adresse" name="adresse" icone={MapPin} requis value={f.adresse} onChange={changer} erreur={erreurs.adresse} /></div>
          )}
          {utilisateur.role === 'LIVREUR' && (
            <ChampSelect label="Type de véhicule" name="vehicule" icone={Bike} options={VEHICULES} value={f.vehicule} onChange={changer} erreur={erreurs.vehicule} />
          )}
        </div>
        <div className="flex justify-end"><Bouton type="submit" chargement={envoi}>Enregistrer</Bouton></div>
      </form>
    </Carte>
  );
}

function FormulaireMotDePasse() {
  const VIDE = { ancienMotDePasse: '', nouveauMotDePasse: '', confirmationMotDePasse: '' };
  const [f, setF] = useState(VIDE);
  const [erreurs, setErreurs] = useState({});
  const [message, setMessage] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const changer = (e) => setF((a) => ({ ...a, [e.target.name]: e.target.value }));

  async function soumettre(e) {
    e.preventDefault();
    const locales = {};
    if (!f.ancienMotDePasse) locales.ancienMotDePasse = 'Champ obligatoire';
    if (!(f.nouveauMotDePasse.length >= 8 && /[A-Za-z]/.test(f.nouveauMotDePasse) && /\d/.test(f.nouveauMotDePasse))) {
      locales.nouveauMotDePasse = '8 caractères minimum, dont une lettre et un chiffre';
    }
    if (f.nouveauMotDePasse !== f.confirmationMotDePasse) locales.confirmationMotDePasse = 'Les mots de passe ne correspondent pas';
    setErreurs(locales);
    setMessage(null);
    if (Object.keys(locales).length) return;
    setEnvoi(true);
    try {
      await profilApi.changerMotDePasse(f);
      setF(VIDE);
      setMessage({ type: 'succes', texte: 'Mot de passe modifié.' });
    } catch (err) {
      setErreurs(erreursDesChamps(err));
      setMessage({ type: 'erreur', texte: messageErreur(err) });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Carte className="p-6">
      <h2 className="text-base font-semibold text-slate-900">Sécurité</h2>
      <form onSubmit={soumettre} className="mt-4 space-y-4" noValidate>
        {message && <Alerte type={message.type}>{message.texte}</Alerte>}
        <ChampMotDePasse label="Mot de passe actuel" name="ancienMotDePasse" icone={Lock} requis autoComplete="current-password" value={f.ancienMotDePasse} onChange={changer} erreur={erreurs.ancienMotDePasse} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ChampMotDePasse label="Nouveau mot de passe" name="nouveauMotDePasse" icone={Lock} requis autoComplete="new-password" value={f.nouveauMotDePasse} onChange={changer} erreur={erreurs.nouveauMotDePasse} />
          <ChampMotDePasse label="Confirmer" name="confirmationMotDePasse" icone={Lock} requis autoComplete="new-password" value={f.confirmationMotDePasse} onChange={changer} erreur={erreurs.confirmationMotDePasse} />
        </div>
        <div className="flex justify-end"><Bouton type="submit" variante="secondaire" chargement={envoi}>Changer le mot de passe</Bouton></div>
      </form>
    </Carte>
  );
}

export default function Profil() {
  return (
    <>
      <EnTetePage titre="Mon profil" sousTitre="Consultez et modifiez vos informations" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div><CartePhoto /></div>
        <div className="space-y-6 lg:col-span-2">
          <FormulaireInformations />
          <FormulaireMotDePasse />
        </div>
      </div>
    </>
  );
}
