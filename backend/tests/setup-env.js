// Chargé avant chaque fichier de test : utilise la base de test (.env.test).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test'), override: true });
