import { BarChart3, Bell, Bot, FileText, Bike, History, Home, LayoutDashboard, ListOrdered, Package, PackagePlus, Settings, Truck, UserCircle, Users, UsersRound } from 'lucide-react';

// Menus de chaque espace (barre latérale sur ordinateur, barre du bas sur mobile pour client et livreur)
export const NAVIGATION = {
  ADMIN: [
    { chemin: '/admin', libelle: 'Tableau de bord', icone: LayoutDashboard, exact: true },
    { chemin: '/admin/commandes', libelle: 'Commandes', icone: Package },
    { chemin: '/admin/livraisons', libelle: 'Livraisons', icone: Truck },
    { chemin: '/admin/utilisateurs', libelle: 'Utilisateurs', icone: Users },
    { chemin: '/admin/livreurs', libelle: 'Livreurs', icone: Bike },
    { chemin: '/admin/clients', libelle: 'Clients', icone: UsersRound },
    { chemin: '/admin/statistiques', libelle: 'Statistiques', icone: BarChart3 },
    { chemin: '/admin/rapports', libelle: 'Rapports', icone: FileText },
    { chemin: '/admin/notifications', libelle: 'Notifications', icone: Bell, compteur: true },
    { chemin: '/admin/parametres', libelle: 'Paramètres', icone: Settings },
  ],
  CLIENT: [
    { chemin: '/client', libelle: 'Accueil', icone: Home, exact: true },
    { chemin: '/client/commandes/nouvelle', libelle: 'Commander', icone: PackagePlus, exact: true },
    { chemin: '/client/commandes', libelle: 'Mes commandes', libelleCourt: 'Commandes', icone: ListOrdered, exclure: '/client/commandes/nouvelle' },
    { chemin: '/client/assistant', libelle: 'Assistant IA', libelleCourt: 'Assistant', icone: Bot },
    // Sur mobile, les notifications restent accessibles par la cloche de l'en-tête (5 onglets maximum)
    { chemin: '/client/notifications', libelle: 'Notifications', icone: Bell, compteur: true, mobile: false },
    { chemin: '/client/profil', libelle: 'Profil', icone: UserCircle },
  ],
  LIVREUR: [
    { chemin: '/livreur', libelle: 'Accueil', icone: Home, exact: true },
    { chemin: '/livreur/livraisons', libelle: 'Mes livraisons', libelleCourt: 'Livraisons', icone: Bike },
    { chemin: '/livreur/historique', libelle: 'Historique', icone: History },
    { chemin: '/livreur/performances', libelle: 'Performances', libelleCourt: 'Stats', icone: BarChart3 },
    // Sur mobile, les notifications restent accessibles par la cloche de l'en-tête (5 onglets maximum)
    { chemin: '/livreur/notifications', libelle: 'Notifications', icone: Bell, compteur: true, mobile: false },
    { chemin: '/livreur/profil', libelle: 'Profil', icone: UserCircle },
  ],
};

// Page de détail d'une commande selon le rôle (utilisée par les notifications)
export const CHEMIN_COMMANDE = {
  CLIENT: (id) => `/client/commandes/${id}`,
  LIVREUR: (id) => `/livreur/livraisons/${id}`,
  ADMIN: (id) => `/admin/commandes/${id}`,
};
