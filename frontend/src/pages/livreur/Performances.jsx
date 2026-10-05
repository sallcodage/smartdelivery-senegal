import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';
import { Carte, EnTetePage } from '../../components/ui/Divers';
import GrillePerformances from '../../components/livraisons/GrillePerformances';
import { EtatsRequete } from '../../components/ui/Etats';
import { useRequete } from '../../hooks/useRequete';
import { livreurApi } from '../../api/livreurApi';
import { formaterFCFA } from '../../utils/format';

const PERIODES = [{ cle: '7j', libelle: '7 jours' }, { cle: '30j', libelle: '30 jours' }, { cle: 'tout', libelle: 'Tout' }];
const jourCourt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

export default function Performances() {
  const [periode, setPeriode] = useState('30j');
  const requete = useRequete(() => livreurApi.performances(periode), [periode]);

  return (
    <>
      <EnTetePage
        titre="Mes performances"
        sousTitre="Calculées à partir de vos livraisons réelles."
        actions={(
          <div className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200" role="tablist">
            {PERIODES.map((p) => (
              <button key={p.cle} type="button" role="tab" aria-selected={periode === p.cle} onClick={() => setPeriode(p.cle)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${periode === p.cle ? 'bg-vert-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{p.libelle}</button>
            ))}
          </div>
        )}
      />
      <EtatsRequete requete={requete}>
        {(p) => (
          <div className="space-y-6">
            <GrillePerformances p={p} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Carte className="p-5">
                <h2 className="text-base font-semibold text-slate-900">Livraisons par jour</h2>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={p.parJour} margin={{ left: -20, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tickFormatter={jourCourt} tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip labelFormatter={jourCourt} formatter={(v) => [v, 'Livraisons']} />
                      <Bar dataKey="livraisons" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Carte>
              <Carte className="p-5">
                <h2 className="text-base font-semibold text-slate-900">Gains par jour (FCFA)</h2>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={p.parJour} margin={{ left: 0, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tickFormatter={jourCourt} tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={56} />
                      <Tooltip labelFormatter={jourCourt} formatter={(v) => [formaterFCFA(v), 'Gains']} />
                      <Area type="monotone" dataKey="gains" stroke="#16a34a" fill="#d3f5de" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Carte>
            </div>
            {periode === 'tout' && <p className="text-xs text-slate-500">Les graphiques affichent les 30 derniers jours ; les indicateurs couvrent tout l'historique.</p>}
          </div>
        )}
      </EtatsRequete>
    </>
  );
}
