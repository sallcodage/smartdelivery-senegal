// Application Express (séparée du serveur pour pouvoir être testée).
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config/app');
const routes = require('./routes');
const { routeIntrouvable, gestionErreurs } = require('./middleware/erreurs');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigines }));
app.use(express.json({ limit: '100kb' }));
if (config.env === 'development') app.use(morgan('dev'));

app.use('/api', routes);

app.use(routeIntrouvable);
app.use(gestionErreurs);

module.exports = app;
