// Application Express (séparée du serveur pour pouvoir être testée).
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config/app');
const routes = require('./routes');
const { routeIntrouvable, gestionErreurs } = require('./middleware/erreurs');

const app = express();

// Hébergement derrière un proxy (Render, etc.) : l'adresse IP réelle du visiteur est lue
// dans l'en-tête X-Forwarded-For. Indispensable pour la limitation des tentatives de connexion.
// TRUST_PROXY = nombre de proxys devant l'API (1 par défaut en production, 0 en local).
const proxys = process.env.TRUST_PROXY ?? (config.env === 'production' ? '1' : '0');
if (Number(proxys) > 0) app.set('trust proxy', Number(proxys));

app.use(helmet());
app.use(cors({ origin: config.corsOrigines }));
app.use(express.json({ limit: '100kb' }));
if (config.env === 'development') app.use(morgan('dev'));

app.use('/api', routes);

app.use(routeIntrouvable);
app.use(gestionErreurs);

module.exports = app;
