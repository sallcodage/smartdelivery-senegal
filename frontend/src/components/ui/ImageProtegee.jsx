import { useEffect, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import api from '../../api/client';

// Image accessible uniquement avec le jeton (documents du livreur) : chargée via l'API puis affichée
export default function ImageProtegee({ url, alt, className = 'h-40 w-full' }) {
  const [source, setSource] = useState('');
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    if (!url) return undefined;
    let lien = '';
    api.get(url.replace(/^\/api/, ''), { responseType: 'blob' })
      .then((r) => { lien = URL.createObjectURL(r.data); setSource(lien); })
      .catch(() => setErreur(true));
    return () => lien && URL.revokeObjectURL(lien);
  }, [url]);

  const cadre = `${className} flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500`;
  if (!url) return <div className={cadre}><span className="text-sm">Non fourni</span></div>;
  if (erreur) return <div className={cadre}><ImageOff className="h-6 w-6" aria-label="Image indisponible" /></div>;
  if (!source) return <div className={cadre}><Loader2 className="h-6 w-6 animate-spin" aria-label="Chargement" /></div>;
  return (
    <a href={source} target="_blank" rel="noreferrer" title="Ouvrir en grand">
      <img src={source} alt={alt} className={`${className} rounded-lg border border-slate-200 object-cover`} />
    </a>
  );
}
