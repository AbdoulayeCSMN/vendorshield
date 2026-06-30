# Documentation Avilyre (Mintlify)

Documentation propulsée par [Mintlify](https://mintlify.com).

## Prévisualiser en local

```bash
npm i -g mint        # CLI Mintlify
cd docs
mint dev             # http://localhost:3000
```

## Structure

- `docs.json` — configuration et navigation
- `introduction.mdx`, `quickstart.mdx`, `concepts.mdx` — démarrage
- `features/` — fonctionnalités (fournisseurs, imports, évaluations, alertes, exposition, ML, copilote)
- `deployment/` — variables d'environnement, automatisation/cron, service ML
- `reference/` — référence des endpoints API

## Déploiement

Connectez ce dépôt à Mintlify (dashboard) ; chaque push met la doc à jour. Le `docs.json`
peut aussi être déplacé à la racine du dépôt selon votre configuration Mintlify.
