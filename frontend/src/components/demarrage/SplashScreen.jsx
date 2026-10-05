import { LogoMarque } from '../ui/Logo';
import './SplashScreen.css';

// Écran de démarrage : logo officiel, nom, signature et chargement discret.
// Purement visuel : la logique (durée, vérification de session) est dans Demarrage.jsx.
export default function SplashScreen({ sortie = false }) {
  return (
    <div className={`splash${sortie ? ' splash--sortie' : ''}`} role="status" aria-live="polite" aria-label="Chargement de SmartDelivery Sénégal">
      <div className="splash__contenu">
        <div className="splash__logo">
          <LogoMarque className="splash__marque" />
        </div>
        <p className="splash__nom">
          Smart<span className="splash__nom-accent">Delivery</span>
        </p>
        <p className="splash__pays">Sénégal</p>
        <p className="splash__slogan">Livrer mieux. Suivre simplement.</p>
        <div className="splash__chargement" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
