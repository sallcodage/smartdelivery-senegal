import { useState } from 'react';
import { Bike, IdCard, Lock, Mail, MapPin, Phone, User } from 'lucide-react';
import { Champ, ChampMotDePasse, ChampSelect } from '../ui/Champ';
import { Alerte } from '../ui/Divers';
import Bouton from '../ui/Bouton';
import { adminApi } from '../../api/adminApi';
import { erreursDesChamps, messageErreur } from '../../api/client';
import { VEHICULES } from '../../config/roles';

const ROLES = [
  { valeur: 'CLIENT', libelle: 'Client' },
  { valeur: 'LIVREUR', libelle: 'Livreur' },
  { valeur: 'ADMIN', libelle: 'Administrateur' },
];

// Création (utilisateur = null) ou modification d'un compte par l'administrateur
export default function FormulaireUtilisateur({ utilisateur = null, roleInitial = 'CLIENT', onEnregistre, onAnnuler }) {
  const creation = !utilisateur;
  const [f, setF] = useState({
    role: utilisateur?.role || roleInitial, prenom: utilisateur?.prenom || '', nom: utilisateur?.nom || '',
    email: utilisateur?.email || '', telephone: utilisateur?.telephone || '', motDePasse: '',
    adresse: utilisateur?.adresse || '', vehicule: utilisateur?.vehicule || '', numeroPermis: utilisateur?.numeroPermis || '',
  });
  const [erreurs, setErreurs] = useState({});
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const changer = (e) => { setF((a) => ({ ...a, [e.target.name]: e.target.value })); setErreurs((a) => ({ ...a, [e.target.name]: undefined })); };

  async function soumettre(e) {
    e.preventDefault();
    const d = { prenom: f.prenom.trim(), nom: f.nom.trim(), email: f.email.trim(), telephone: f.telephone.trim() };
    if (creation) Object.assign(d, { role: f.role, motDePasse: f.motDePasse });
    if (f.role === 'CLIENT') d.adresse = f.adresse.trim();
    if (f.role === 'LIVREUR') Object.assign(d, { vehicule: f.vehicule, numeroPermis: f.numeroPermis.trim() || undefined });
    setEnvoi(true);
    setErreur('');
    try {
      const resultat = creation ? await adminApi.creerUtilisateur(d) : await adminApi.modifierUtilisateur(utilisateur.id, d);
      onEnregistre(resultat);
    } catch (err) {
      setErreurs(erreursDesChamps(err));
      setErreur(messageErreur(err));
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={soumettre} noValidate className="space-y-4">
      {erreur && <Alerte type="erreur">{erreur}</Alerte>}
      {creation && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Type de compte</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {ROLES.map((r) => (
              <button key={r.valeur} type="button" role="radio" aria-checked={f.role === r.valeur} onClick={() => setF((a) => ({ ...a, role: r.valeur }))}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${f.role === r.valeur ? 'border-vert-500 bg-vert-50 text-vert-700' : 'border-slate-200 text-slate-600 hover:border-vert-300'}`}>
                {r.libelle}
              </button>
            ))}
          </div>
          {f.role === 'ADMIN' && <p className="mt-2 text-xs text-amber-700">Un administrateur a accès à toutes les données et peut gérer tous les comptes.</p>}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ label="Prénom" name="prenom" icone={User} requis value={f.prenom} onChange={changer} erreur={erreurs.prenom} />
        <Champ label="Nom" name="nom" icone={User} requis value={f.nom} onChange={changer} erreur={erreurs.nom} />
        <Champ label="Adresse e-mail" name="email" type="email" icone={Mail} requis value={f.email} onChange={changer} erreur={erreurs.email} />
        <Champ label="Téléphone" name="telephone" type="tel" icone={Phone} requis value={f.telephone} onChange={changer} erreur={erreurs.telephone} />
        {creation && (
          <div className="sm:col-span-2">
            <ChampMotDePasse label="Mot de passe provisoire" name="motDePasse" icone={Lock} requis autoComplete="new-password" aide="8 caractères minimum, dont une lettre et un chiffre. À communiquer à l'utilisateur, qui pourra le changer." value={f.motDePasse} onChange={changer} erreur={erreurs.motDePasse} />
          </div>
        )}
        {f.role === 'CLIENT' && <div className="sm:col-span-2"><Champ label="Adresse" name="adresse" icone={MapPin} requis value={f.adresse} onChange={changer} erreur={erreurs.adresse} /></div>}
        {f.role === 'LIVREUR' && (
          <>
            <ChampSelect label="Véhicule" name="vehicule" icone={Bike} requis placeholder="Sélectionner" options={VEHICULES} value={f.vehicule} onChange={changer} erreur={erreurs.vehicule} />
            <Champ label="Numéro de permis" name="numeroPermis" icone={IdCard} value={f.numeroPermis} onChange={changer} erreur={erreurs.numeroPermis} />
          </>
        )}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Bouton variante="secondaire" onClick={onAnnuler}>Annuler</Bouton>
        <Bouton type="submit" chargement={envoi}>{creation ? 'Créer le compte' : 'Enregistrer'}</Bouton>
      </div>
    </form>
  );
}
