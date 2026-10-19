# Publier sur portfolio.jobandjudith.com

Destination retenue : **https://portfolio.jobandjudith.com**, serveur **oliviolet.o2switch.net**, identifiant cPanel **defr6769** (confirmés par le mail de bienvenue).

`defr6769.odns.fr` est l’adresse technique du site. Le déploiement utilise le nom du serveur indiqué dans le mail : `oliviolet.o2switch.net`.

Le code est prêt. Le sous-domaine, le certificat HTTPS et les autorisations restent à configurer dans le compte o2switch. Aucune connexion authentifiée à ce compte n’a encore été réalisée depuis ce projet.

## 1. Créer le sous-domaine

Dans cPanel, ouvrir **Sous-domaines** (ou **Domaines**, selon la présentation), puis créer `portfolio.jobandjudith.com`.

Choisir une racine de documents dédiée nommée `portfolio.jobandjudith.com`, par exemple `/home/TON_IDENTIFIANT/portfolio.jobandjudith.com`. Le déploiement attend ce nom de dossier ; ne pas sélectionner la racine du compte ou celle du domaine principal.

Noter le **chemin absolu exact** affiché par cPanel. Si les DNS sont hébergés ailleurs, faire pointer le sous-domaine sur l’hébergement. Activer ou attendre le certificat HTTPS dans cPanel avant la première publication.

Référence : [sous-domaines o2switch](https://faq.o2switch.fr/cpanel/domaines/configuration-sous-domaine/).

## 2. Préparer une clé de déploiement dédiée

Sur ton ordinateur, générer une nouvelle paire de clés dans un emplacement que tu choisis, par exemple avec `ssh-keygen -t rsa -b 4096`. Utiliser un nom de fichier neuf : ne pas remplacer une clé existante. Cette clé d’automatisation doit fonctionner sans saisie interactive de passphrase.

Installer uniquement sa **clé publique** dans les clés autorisées du compte cPanel. La clé privée sera placée dans un secret GitHub.

Après autorisation SSH de l’IP de ton ordinateur dans cPanel, établir une première connexion au serveur avec `ssh defr6769@oliviolet.o2switch.net` en vérifiant son empreinte. Récupérer ensuite l’entrée correspondante du fichier `known_hosts` de ton ordinateur : elle identifie le serveur pour le déploiement. Pour rechercher cette entrée, utiliser `ssh-keygen -F oliviolet.o2switch.net`. Conserver les lignes de clé, sans la ligne de commentaire du résultat.

Référence : [connexion SSH o2switch](https://faq.o2switch.fr/guides/webmastering/connexion-ssh/).

## 3. Créer un jeton d’API cPanel

Dans **Manage API Tokens / Gérer les jetons d’API**, créer un jeton dédié au déploiement. Il permet au workflow d’ajouter temporairement son adresse IP dans la liste blanche SSH, puis de retirer l’exception créée par ce lancement.

Références : [jetons cPanel](https://faq.o2switch.fr/cpanel/securite/token-api-cpanel/) et [autorisation SSH pour CI/CD](https://faq.o2switch.fr/cpanel/outils/exception-parefeu/).

## 4. Renseigner GitHub

Dans `erebethos/vitrine-pro`, ouvrir **Settings → Secrets and variables → Actions → Secrets** et créer les secrets de dépôt suivants. Entrer les valeurs directement dans GitHub, sans les ajouter aux fichiers du projet.

| Secret | Valeur |
| --- | --- |
| `O2_SSH_USER` | `defr6769` |
| `O2_SSH_PRIVATE_KEY` | Contenu complet de la clé privée de déploiement |
| `O2_SSH_KNOWN_HOSTS` | Entrée du serveur obtenue après vérification de la connexion SSH |
| `O2_CPANEL_TOKEN` | Jeton d’API cPanel dédié |
| `O2_DEPLOY_PATH` | Racine absolue du sous-domaine, par exemple `/home/TON_IDENTIFIANT/portfolio.jobandjudith.com` |

Dans l’onglet **Variables**, créer `O2_DEPLOY_ENABLED` avec la valeur `true` lorsque tout est configuré. Avant cette activation, le job de publication est ignoré.

## 5. Premier déploiement

Les nouveaux push sur `refonte-pro-2026` déclenchent le workflow. Après la configuration, demander la publication pour envoyer un nouveau commit et surveiller le résultat dans **Actions**.

Le workflow génère les pages avec le domaine public, exécute les vérifications, autorise l’IP du runner, transfère le contenu de `dist/` et vérifie le numéro de révision servi sur le sous-domaine. Seuls les fichiers statiques sont envoyés.

L’entrée `workflow_dispatch` sera également utilisable depuis l’interface lorsque le workflow sera présent sur la branche par défaut ; ce n’est pas encore le cas tant que `main` conserve la version scolaire.

## Retours arrière et entretien

Les fichiers remplacés sont sauvegardés hors de la racine web, dans `/home/TON_IDENTIFIANT/.portfolio-backups/REVISION_GIT/`. Les fichiers inchangés ne sont pas recopiés ; les fichiers distants absents du nouveau site ne sont pas supprimés automatiquement.

Un retour complet à une version précédente consiste à redéployer le contenu du commit voulu, en tenant compte des éventuels fichiers ajoutés depuis. Le dossier de sauvegarde contient les fichiers remplacés, pas une archive complète du site. Aucune purge automatique des sauvegardes n’est installée.

Le script conserve les exceptions SSH préexistantes et essaie de retirer uniquement celles qu’il a créées, même après un échec. En cas d’arrêt brutal du runner, vérifier la liste blanche dans cPanel.

## Générer un paquet manuellement

```sh
SITE_ORIGIN=https://portfolio.jobandjudith.com npm run build
SITE_ORIGIN=https://portfolio.jobandjudith.com npm run check
```

Le contenu de `dist/`, y compris `.htaccess`, peut alors être téléversé dans la racine du sous-domaine. `node scripts/build-pages.mjs` sans variable d’environnement régénère les liens pour la version de validation privée.
