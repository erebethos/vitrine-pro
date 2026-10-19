# François de Gennaro — Réseaux & infrastructure

Refonte professionnelle du site vitrine scolaire. HTML sémantique, CSS et JavaScript natifs, sans dépendance de production ni outil de compilation frontend.

## Structure

- `dist/index.html` : source éditoriale française complète et lisible sans JavaScript.
- `dist/en/index.html` : version anglaise générée depuis la structure commune.
- `dist/assets/content.mjs` : traductions anglaises, messages du laboratoire et fiches projets FR/EN.
- `dist/assets/network.mjs` : moteur IPv4 pur, indépendant du DOM.
- `dist/assets/app.mjs` : interactions, laboratoire et fiches projets.
- `tests/network.test.mjs` : cas limites et invariants du calculateur.

## Préparer et vérifier

Node.js 20 ou plus récent. Aucune installation nécessaire.

```sh
npm run build
npm test
npm run check
```

Servir ensuite **le dossier `dist/`** avec un serveur statique, pas le dossier racine. Exemple de développement local :

```sh
python3 -m http.server 8000 --directory dist
```

Ne pas ouvrir les fichiers via `file://` : les modules JavaScript ont besoin d’un serveur HTTP.

## Choix techniques

- Badge officiel CCST Networking : image Cisco provenant de [la fiche Credly de la certification](https://www.credly.com/org/cisco/badge/cisco-certified-support-technician-networking-ccst-.1), conservée sans modification. Le lien présente la certification, pas une attestation nominative ; il pourra être remplacé par le badge Credly personnel de François.

- Deux URL FR/EN réelles, générées depuis une structure commune ; `lang`, titres, descriptions, canonical et hreflang localisés.
- Préférence de langue stockée localement quand le navigateur l’autorise. Les liens restent fonctionnels sans stockage ni JavaScript.
- Calculateur de /0 à /32 ; arithmétique non signée sans opérateurs bit à bit JavaScript signés. /31 traité comme une liaison point à point, /32 comme une adresse unique.
- Mini-défi sur des plages privées de /16 à /30, correction et score de session. Aucun compte ni classement distant.
- Onglets utilisables au clavier et fiches projets dans un dialogue natif.
- Aucun appel réseau pour les adresses saisies, aucun outil d’analyse d’audience, aucune BDD artificielle.
- Le moteur IPv4 calcule une plage mathématique : il ne prétend pas que toutes les adresses de la plage sont routables ou attribuables dans tous les contextes.
- La topologie d’accueil est une illustration, pas un tableau de supervision ni une démo opérationnelle du TFE.

## Contenu vérifié et limites

Le TFE est présenté **en conception**, pas comme un moteur de simulation livré. Les projets SQL et Java sont distincts ; la version Java utilise la sérialisation fichier. Les services Azure du TP ne sont pas annoncés comme des ressources permanentes.

Les dépôts privés ne sont pas rendus publics par cette refonte. Les fiches montrent quelques extraits et indiquent que le code peut être présenté sur demande.

La future application JavaScript/Python/SQL est une piste réservée au laboratoire, hors périmètre de cette version.

## Avant les candidatures

- Ajouter le CV PDF validé et son téléchargement direct (actuellement : demande par e-mail).
- Confirmer les dates et modalités exactes du stage ; aucune date n’a été inventée dans la vitrine.
- Valider les formulations de compétences et les traductions avec François.
- Faire une passe visuelle réelle sur ordinateur et téléphone.
- Choisir l’URL publique finale et adapter canonical/hreflang si le domaine change.
- Rendre publics uniquement les dépôts ou extraits choisis explicitement.

## Hébergement

`.openai/hosting.json` identifie la version de validation hébergée avec Sites. Le site reste portable vers un hébergement statique. Les URL canoniques actuelles pointent vers cette version ; les adapter lors d’une migration.

La branche `main` conserve le projet scolaire. La refonte est isolée dans `refonte-pro-2026` ; aucune fusion dans `main` n’est réalisée automatiquement.
