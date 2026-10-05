import { Link } from 'react-router-dom';
import Logo from '../../components/ui/Logo';
import { Carte } from '../../components/ui/Divers';

function PageLegale({ titre, sections }) {
  return (
    <main className="min-h-screen bg-fond px-4 py-10">
      <Carte className="mx-auto max-w-3xl p-8">
        <Link to="/connexion"><Logo /></Link>
        <h1 className="mt-8 text-2xl font-bold text-slate-900">{titre}</h1>
        <p className="mt-1 text-sm text-slate-500">Document de démonstration établi dans le cadre d'un projet académique.</p>
        <div className="mt-6 space-y-5">
          {sections.map(([sousTitre, texte]) => (
            <section key={sousTitre}>
              <h2 className="font-semibold text-slate-900">{sousTitre}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{texte}</p>
            </section>
          ))}
        </div>
      </Carte>
    </main>
  );
}

export function Conditions() {
  return (
    <PageLegale
      titre="Conditions d'utilisation"
      sections={[
        ['Objet', "SmartDelivery Sénégal met en relation des clients souhaitant faire livrer des colis et des livreurs partenaires, sous la supervision d'une équipe d'administration."],
        ['Compte', "Chaque utilisateur est responsable de la confidentialité de son mot de passe. Les comptes livreurs sont activés après vérification des documents fournis."],
        ['Commandes et tarifs', "Le montant d'une livraison est calculé automatiquement selon la distance du trajet, avant validation de la commande. Une commande peut être annulée par le client tant qu'elle n'a pas été validée."],
        ['Obligations du livreur', "Le livreur s'engage à transmettre sa position pendant les livraisons en cours et à mettre à jour le statut de chaque livraison."],
        ['Suspension', "SmartDelivery peut suspendre un compte en cas d'usage frauduleux ou contraire aux présentes conditions."],
      ]}
    />
  );
}

export function Confidentialite() {
  return (
    <PageLegale
      titre="Politique de confidentialité"
      sections={[
        ['Données collectées', "Identité, coordonnées (e-mail, téléphone, adresse), photos facultatives, documents du livreur (permis, véhicule), commandes et positions GPS du livreur pendant une livraison en cours."],
        ['Finalités', "Gestion des comptes et des livraisons, suivi en temps réel, notifications, statistiques de performance du service."],
        ['Sécurité', "Les mots de passe sont chiffrés (bcrypt). Les documents des livreurs ne sont accessibles qu'à l'administration et au livreur concerné."],
        ['Vos droits', "Conformément à la loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel, vous pouvez demander l'accès, la rectification ou la suppression de vos données auprès de l'administration SmartDelivery."],
      ]}
    />
  );
}
