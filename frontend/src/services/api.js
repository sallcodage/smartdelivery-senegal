// ======================================================
// CONFIGURATION API SMARTDELIVERY
// ======================================================

const API_URL = "http://localhost:5000";


// ======================================================
// RECUPERER LE TOKEN
// ======================================================

export const getToken = () => {
  return localStorage.getItem("smartdelivery_token");
};


// ======================================================
// RECUPERER L'UTILISATEUR CONNECTE
// ======================================================

export const getUtilisateur = () => {
  const utilisateur = localStorage.getItem(
    "smartdelivery_utilisateur"
  );

  if (!utilisateur) {
    return null;
  }

  try {
    return JSON.parse(utilisateur);
  } catch {
    return null;
  }
};


// ======================================================
// ENREGISTRER LA SESSION
// ======================================================

export const enregistrerSession = (
  token,
  utilisateur
) => {
  localStorage.setItem(
    "smartdelivery_token",
    token
  );

  localStorage.setItem(
    "smartdelivery_utilisateur",
    JSON.stringify(utilisateur)
  );
};


// ======================================================
// DECONNEXION
// ======================================================

export const deconnexion = () => {
  localStorage.removeItem(
    "smartdelivery_token"
  );

  localStorage.removeItem(
    "smartdelivery_utilisateur"
  );
};


// ======================================================
// CONNEXION
// ======================================================

export const connexion = async (
  email,
  motDePasse
) => {
  const response = await fetch(
    `${API_URL}/api/auth/login`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        email: email,
        mot_de_passe: motDePasse
      })
    }
  );


  const data = await response.json();


  if (!response.ok) {
    throw new Error(
      data.message ||
      "Impossible de se connecter."
    );
  }


  // Enregistrer automatiquement le JWT
  // et les informations utilisateur
  if (
    data.data?.token &&
    data.data?.utilisateur
  ) {
    enregistrerSession(
      data.data.token,
      data.data.utilisateur
    );
  }


  return data;
};


// ======================================================
// REQUETE API AUTHENTIFIEE
// ======================================================

export const apiFetch = async (
  endpoint,
  options = {}
) => {
  const token = getToken();


  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };


  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }


  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers
    }
  );


  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }


  if (!response.ok) {
    throw new Error(
      data?.message ||
      "Une erreur est survenue."
    );
  }


  return data;
};


// ======================================================
// EXPORT URL API
// ======================================================

export { API_URL };