function lirePagination(q = {}) {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limite = Math.min(100, Math.max(1, parseInt(q.limite, 10) || 20));
  return { page, limite, offset: (page - 1) * limite };
}

// Les lignes doivent contenir une colonne « total » (count(*) OVER()).
function paginer(lignes, { page, limite }) {
  const total = lignes.length ? lignes[0].total : 0;
  return {
    donnees: lignes.map(({ total: _t, ...reste }) => reste),
    pagination: { page, limite, total, pages: Math.ceil(total / limite) },
  };
}

module.exports = { lirePagination, paginer };
