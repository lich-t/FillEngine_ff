# 🚀 FillEngine Extension

Extension Firefox/Chrome moderne pour le remplissage automatique intelligent de formulaires web, en particulier Google Forms. Utilisez vos propres données CSV pour un remplissage personnalisé !

## ✨ Fonctionnalités

- 🎯 **Remplissage intelligent** : Détection automatique des champs de formulaire
- 📝 **Support Google Forms** : Optimisé pour les formulaires Google
- 📊 **Données CSV** : Chargez vos propres données depuis un fichier CSV
- ⚙️ **Configuration flexible** : Adaptation automatique selon le type de page
- 📈 **Statistiques détaillées** : Rapport complet du remplissage
- 🎨 **Interface moderne** : Design épuré et intuitif
- 🔧 **Architecture modulaire** : Code organisé en modules spécialisés

## 🆕 Version 1.1.1

- ✅ **Support multi-navigateurs** : Compatible Firefox et Chrome
- ✅ **Upload CSV** : Chargez vos données personnelles via un fichier CSV
- ✅ **Sécurité renforcée** : Vos données restent locales
- ✅ **Flexibilité maximale** : Utilisez l'extension avec n'importe quelles données
- ✅ **Validation avancée** : Vérification automatique du format CSV
- ✅ **Architecture améliorée** : Code modulaire et maintenable

## 📦 Installation

### Firefox
1. Téléchargez ou clonez ce projet
2. Ouvrez Firefox et accédez à `about:debugging`
3. Cliquez sur "Ce Firefox"
4. Cliquez sur "Charger un module temporaire"
5. Sélectionnez le fichier `manifest.json` du projet

### Chrome
1. Téléchargez ou clonez ce projet
2. Ouvrez Chrome et accédez à `chrome://extensions/`
3. Activez le "Mode développeur"
4. Cliquez sur "Charger l'extension non empaquetée"
5. Sélectionnez le dossier de l'extension

## 🎯 Utilisation

### 1. Préparer vos données

1. Créez un fichier CSV avec vos données personnelles
2. Le format CSV est flexible - utilisez les colonnes qui correspondent à vos besoins
3. Consultez la section Configuration CSV ci-dessous pour plus de détails

### 2. Charger les données

1. Cliquez sur l'icône de l'extension dans votre navigateur
2. Cliquez sur "📁 Charger données CSV"
3. Sélectionnez votre fichier CSV
4. Attendez la confirmation de chargement

### 3. Remplir un formulaire

1. Naviguez vers le formulaire web (Google Forms recommandé)
2. Cliquez sur l'icône de l'extension
3. Cliquez sur "Remplir le formulaire"
4. Consultez les statistiques de remplissage

## 📁 Structure du projet

```
FillEngine_ff/
├── manifest.json              # Configuration de l'extension
├── background.js              # Script d'arrière-plan
├── popup.html                 # Interface utilisateur
├── popup.js                   # Logique de l'interface
├── PRIVACY_POLICY.md          # Politique de confidentialité
├── README.md                  # Ce fichier
├── DOCUMENTATION_BACKGROUND.md # Documentation technique
├── public/
│   └── icons/                # Icônes de l'extension
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       └── icon128.png
└── src/
    ├── core/
    │   ├── config.js          # Configuration générale
    │   └── pageDetector.js    # Détection de type de page
    ├── form/
    │   ├── FieldFiller.js     # Remplissage des champs
    │   ├── FieldMatcher.js    # Correspondance des champs
    │   ├── FormAutoFiller.js  # Orchestrateur principal
    │   ├── FormDetector.js    # Détection des formulaires
    │   └── generateDictionary.js # Génération du dictionnaire
    └── init/
        └── content-init.js    # Initialisation du contenu
```

## 🔧 Configuration CSV

### Format flexible

FillEngine accepte des fichiers CSV avec des colonnes personnalisées. L'extension utilise un système de correspondance intelligent pour mapper vos données aux champs de formulaire.

### Exemple de structure CSV

```csv
nom,prenom,email,telephone,adresse,ville,codePostal,pays,dateNaissance,profession
DUPONT,Jean,jean.dupont@email.com,0123456789,"123 Rue Example",Lyon,69000,France,1985-03-15,Développeur
MARTIN,Marie,marie.martin@email.com,0987654321,"456 Avenue Test",Paris,75000,France,1990-07-22,Designer
```

### Correspondance automatique

L'extension détecte automatiquement les correspondances entre vos colonnes CSV et les champs de formulaire en utilisant :
- Correspondance exacte des noms de colonnes
- Correspondance par mots-clés (nom, prénom, email, etc.)
- Correspondance par type de champ détecté

## 🎨 Interface utilisateur

L'extension propose une interface moderne avec :

- **Section upload** : Zone de glisser-déposer pour les fichiers CSV
- **Status en temps réel** : Indication du statut de chargement
- **Bouton de remplissage** : Action principale avec feedback visuel
- **Statistiques détaillées** : Rapport complet avec métriques
- **Résultats détaillés** : Liste des champs traités

## 🔍 Types de champs supportés

- ✅ **Champs texte** : input[type="text"], textarea
- ✅ **Emails** : input[type="email"]
- ✅ **Téléphones** : input[type="tel"]
- ✅ **Dates** : input[type="date"]
- ✅ **Sélections** : select, dropdown
- ✅ **Boutons radio** : input[type="radio"], role="radio"
- ✅ **Cases à cocher** : input[type="checkbox"], role="checkbox"

## 🌐 Sites supportés

- **Google Forms** : Support complet avec sélecteurs optimisés
- **Formulaires génériques** : Détection automatique des champs
- **Pages locales** : Mode test pour le développement

## 🛠️ Développement

### Architecture modulaire

Le projet utilise une architecture modulaire avec des responsabilités bien définies :

- **Core** : Configuration et détection de page
- **Form** : Logique de détection et remplissage des formulaires
- **Init** : Initialisation et orchestration

### Classes principales

- `FormDetector` : Détection des éléments de formulaire
- `FieldMatcher` : Correspondance intelligente des champs
- `FieldFiller` : Remplissage des différents types de champs
- `FormAutoFiller` : Orchestration principale
- `PageDetector` : Détection du type de page

### Scripts principaux

- `content-init.js` : Point d'entrée principal
- `popup.js` : Interface utilisateur et gestion CSV
- `background.js` : Gestion des permissions et communication

## 🔒 Sécurité et confidentialité

- ✅ **Données locales** : Aucune transmission de données
- ✅ **Permissions minimales** : Accès uniquement aux onglets actifs
- ✅ **Code open source** : Transparence totale
- ✅ **Pas de tracking** : Aucune collecte de données
- ✅ **Traitement local** : Toutes les données restent sur votre machine

## 🐛 Dépannage

### Problèmes courants

1. **Champs non remplis** :
   - Vérifiez que votre CSV est correctement formaté
   - Consultez la console pour les erreurs
   - Vérifiez la correspondance des noms de colonnes

2. **CSV non reconnu** :
   - Vérifiez que le fichier est bien au format CSV
   - Assurez-vous que la première ligne contient les en-têtes
   - Utilisez l'encodage UTF-8

3. **Formulaire non détecté** :
   - Actualisez la page
   - Vérifiez que la page contient des formulaires
   - Testez sur Google Forms pour validation

### Debug

Ouvrez la console développeur (F12) pour voir les logs détaillés :
- `[FillEngine]` : Messages de l'extension
- Statistiques de détection
- Erreurs de remplissage
- Correspondances de champs

## 📊 Métriques

L'extension fournit des statistiques complètes :

- **Questions détectées** : Nombre total de champs trouvés
- **Champs remplis** : Nombre de champs complétés avec succès
- **Taux de réussite** : Pourcentage de réussite global
- **Détails par champ** : Statut individuel de chaque champ
- **Correspondances** : Mapping entre CSV et champs de formulaire

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Signaler des bugs
2. Proposer des améliorations
3. Soumettre des pull requests
4. Améliorer la documentation
5. Ajouter de nouveaux types de champs supportés

## 📄 Licence

Ce projet est distribué sous licence MIT. Voir le fichier LICENSE pour plus de détails.

## 🆘 Support

Pour obtenir de l'aide :

1. Consultez ce README et la documentation technique
2. Vérifiez les issues existantes sur GitHub
3. Créez une nouvelle issue si nécessaire
4. Incluez les logs de la console pour les bugs

## 📞 Contact

- **Auteur** : desiredev
- **GitHub** : https://github.com/lich-t/FillEngine_ff.git
- **Email** : tigerdev@github.com

---

**Développé avec ❤️ pour simplifier le remplissage de formulaires web**

*FillEngine - Votre assistant intelligent pour le remplissage automatique de formulaires*