# Politique de Confidentialité - FillEngine Extension

_Dernière mise à jour : 3 janvier 2025_

## 1. Introduction

Cette politique de confidentialité décrit comment l'extension "FillEngine" traite vos informations personnelles et vos données.

## 2. Collecte de Données

**L'extension NE COLLECTE AUCUNE DONNÉE personnelle.**

- ❌ Aucune donnée n'est envoyée vers des serveurs externes
- ❌ Aucune donnée n'est stockée de manière permanente
- ❌ Aucun tracking ou analyse comportementale
- ❌ Aucune collecte de statistiques d'usage
- ❌ Aucune transmission de données vers des tiers

## 3. Utilisation des Données

### Données CSV :

- Les fichiers CSV que vous uploadez sont traités **uniquement localement** dans votre navigateur
- Ces données ne quittent jamais votre ordinateur
- Elles sont temporairement stockées en mémoire le temps de l'utilisation
- Elles sont automatiquement supprimées à la fermeture de l'extension ou du navigateur
- Aucune sauvegarde persistante n'est effectuée

### Données de Formulaires :

- L'extension lit le contenu des formulaires web uniquement pour les remplir automatiquement
- Ces informations ne sont ni stockées ni transmises
- L'accès se limite aux pages web ouvertes dans votre navigateur
- Aucune donnée de formulaire n'est conservée après le remplissage

### Données de Navigation :

- L'extension détecte uniquement le type de page (Google Forms, formulaires génériques)
- Aucune URL ou contenu de page n'est enregistré
- Aucune historique de navigation n'est conservée

## 4. Permissions Requises

L'extension demande uniquement les permissions minimales nécessaires :

### Firefox :
- **activeTab** : Pour accéder au contenu de l'onglet actuellement ouvert
- **tabs** : Pour détecter les changements d'onglet
- **storage** : Pour stocker temporairement vos données CSV en mémoire locale
- **scripting** : Pour injecter le code nécessaire au remplissage des formulaires

### Chrome :
- **activeTab** : Pour accéder au contenu de l'onglet actuellement ouvert
- **tabs** : Pour détecter les changements d'onglet
- **storage** : Pour stocker temporairement vos données CSV en mémoire locale
- **scripting** : Pour injecter le code nécessaire au remplissage des formulaires

### Sites autorisés :
- **docs.google.com/forms/** : Pour détecter et remplir les Google Forms
- **storage.googleapis.com/** : Pour accéder aux ressources Google Forms

## 5. Sécurité

- ✅ Code source transparent et auditable (open source)
- ✅ Traitement 100% local des données
- ✅ Aucune communication réseau avec des serveurs tiers
- ✅ Permissions minimales strictement nécessaires
- ✅ Architecture modulaire sécurisée
- ✅ Validation des données CSV côté client uniquement

## 6. Stockage Local

### Données temporaires :
- Vos données CSV sont stockées temporairement dans le stockage local du navigateur
- Ces données sont automatiquement effacées lors de la fermeture de l'extension
- Aucune donnée persistante n'est conservée entre les sessions

### Cache :
- L'extension peut utiliser le cache du navigateur pour améliorer les performances
- Ce cache ne contient aucune donnée personnelle
- Il peut être vidé à tout moment via les paramètres du navigateur

## 7. Vos Droits

Vous gardez un contrôle total sur vos données :

- Vous choisissez quels fichiers CSV utiliser
- Vous pouvez supprimer vos données à tout moment en fermant l'extension
- Vous pouvez désactiver l'extension sans laisser de traces
- Aucune donnée ne persiste après désinstallation
- Vous avez accès au code source pour vérifier le fonctionnement

## 8. Compatibilité Navigateurs

### Firefox :
- Version minimale : 109.0
- ID de l'extension : fillengine@tigerdev.com
- Permissions de collecte de données : Aucune requise

### Chrome :
- Compatible avec toutes les versions récentes
- Utilise le Manifest V3 pour une sécurité renforcée

## 9. Modifications

Cette politique peut être mise à jour pour refléter les changements dans l'extension. Les modifications seront communiquées via :

- Les mises à jour de l'extension
- Le dépôt GitHub du projet
- Cette page de politique de confidentialité

## 10. Conformité RGPD

Cette extension respecte le Règlement Général sur la Protection des Données (RGPD) :

- **Minimisation des données** : Seules les données strictement nécessaires sont traitées
- **Transparence** : Politique de confidentialité claire et accessible
- **Contrôle utilisateur** : Vous gardez le contrôle total de vos données
- **Sécurité** : Protection appropriée des données traitées
- **Droit à l'oubli** : Suppression automatique de toutes les données

## 11. Contact

Pour toute question concernant cette politique de confidentialité :

- **Email** : tigerdev@github.com
- **GitHub** : https://github.com/lich-t/FillEngine_ff.git
- **Auteur** : desiredev

## 12. Juridiction

Cette politique de confidentialité est régie par les lois françaises et européennes en matière de protection des données personnelles.

---

**En résumé : Vos données restent chez vous. FillEngine ne collecte, ne stocke, ni ne transmet aucune information personnelle. Toutes les données sont traitées localement dans votre navigateur et supprimées automatiquement.**

*FillEngine - Votre confidentialité est notre priorité*