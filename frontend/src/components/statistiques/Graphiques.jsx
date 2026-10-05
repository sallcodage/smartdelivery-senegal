import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formaterFCFA } from '../../utils/format';

export const COULEURS = ['#16a34a', '#2563eb', '#f59e0b', '#7c3aed', '#dc2626', '#64748b'];
const AXE = { fontSize: 11, fill: '#64748b' };

// Libellé d'une tranche de temps selon le regroupement (jour, semaine, mois)
export function libelleTranche(date, pas) {
  const d = new Date(`${date}T00:00:00Z`);
  if (pas === 'month') return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  const jour = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
  return pas === 'week' ? `sem. ${jour}` : jour;
}

export function CourbeCommandes({ donnees, pas, hauteur = 'h-72' }) {
  return (
    <div className={hauteur}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={donnees} margin={{ left: -20, right: 12, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" tickFormatter={(d) => libelleTranche(d, pas)} tick={AXE} interval="preserveStartEnd" minTickGap={16} />
          <YAxis allowDecimals={false} tick={AXE} />
          <Tooltip labelFormatter={(d) => libelleTranche(d, pas)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="commandes" name="Commandes créées" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} animationDuration={600} />
          <Line type="monotone" dataKey="livrees" name="Livraisons effectuées" stroke="#16a34a" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} animationDuration={600} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarresRevenus({ donnees, pas }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={donnees} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" tickFormatter={(d) => libelleTranche(d, pas)} tick={AXE} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={AXE} width={64} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)} k` : v)} />
          <Tooltip labelFormatter={(d) => libelleTranche(d, pas)} formatter={(v) => [formaterFCFA(v), "Chiffre d'affaires"]} />
          <Bar dataKey="chiffreAffaires" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={36} animationDuration={600} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Anneau + légende avec valeurs (ex. statuts, types de colis)
export function Anneau({ parts, unite = '' }) {
  const total = parts.reduce((t, p) => t + p.valeur, 0);
  if (!total) return <p className="py-16 text-center text-sm text-slate-400">Aucune donnée sur la période</p>;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={parts} dataKey="valeur" nameKey="libelle" innerRadius="62%" outerRadius="100%" paddingAngle={2} stroke="none">
              {parts.map((p, i) => <Cell key={p.libelle} fill={p.couleur || COULEURS[i % COULEURS.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [`${v}${unite}`, n]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{total}</span><span className="text-xs text-slate-500">au total</span>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {parts.map((p, i) => (
          <li key={p.libelle} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.couleur || COULEURS[i % COULEURS.length] }} />{p.libelle}</span>
            <span className="font-semibold text-slate-900">{p.valeur}{p.pourcentage != null && <span className="ml-1 font-normal text-slate-400">({String(p.pourcentage).replace('.', ',')} %)</span>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Barres horizontales simples (« Zones les plus actives » du prototype)
export function BarresHorizontales({ lignes }) {
  const max = Math.max(1, ...lignes.map((l) => l.valeur));
  return (
    <ul className="space-y-3">
      {lignes.map((l) => (
        <li key={l.libelle} className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-3 text-sm">
          <span className="truncate text-slate-600">{l.libelle}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-600" style={{ width: `${(l.valeur / max) * 100}%` }} /></span>
          <span className="text-right font-semibold text-slate-900">{String(l.pourcentage).replace('.', ',')} %</span>
        </li>
      ))}
    </ul>
  );
}
