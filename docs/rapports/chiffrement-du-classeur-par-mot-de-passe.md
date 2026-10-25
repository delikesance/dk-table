# Rapport : Chiffrement du classeur par mot de passe
Statut : termine
Visible : oui

## Fait

- `src/io/crypto.ts` : PBKDF2-SHA256 + AES-GCM 256 (Web Crypto), enveloppe JSON `dktable-encrypted`.
- `src/io/protected.ts` : encodage/décodage d'un document ; `PasswordRequiredError` sans mot de passe, `WrongPasswordError` si erroné.
- `src/io/files.ts` : `openPath` et `saveDocument`/`saveAs` acceptent un mot de passe ; `pickDocument` séparé.
- `src/ui/protection.ts` : mot de passe de la session (jamais dans le fichier).
- `src/ui/dialogs/password.ts` : boîte mot de passe (saisie, confirmation, erreur affichée sans fermer).
- `src/ui/fileops.ts` : ouvrir un fichier chiffré (boîte « Classeur protégé »), chiffrer, retirer ; annulation du toast restaure le mot de passe précédent.
- `src/ui/toolbar/menus.ts`, `src/ui/menubar/deps.ts` : entrées Fichier « Chiffrer avec mot de passe… » et « Retirer le mot de passe ».
- Autosave : test dédié (`src/ui/autosaveUi.test.ts`) : un classeur protégé est réenregistré avec le mot de passe de session.
- Tests unitaires : `src/io/crypto.test.ts`, `src/io/protected.test.ts`, `src/ui/protection.test.ts`, `src/ui/dialogs/password.test.ts`. E2E : `e2e/feat-chiffrement.spec.ts`.
- Documentation : `docs/chiffrement.md`.
- Indicateur « (chiffré) » dans le titre de la fenêtre tant que le classeur a un mot de passe (`appState.renderTitle`) ; `protection.ts` prévient l'app (`onPasswordChange`) pour repeindre le titre. Tests : `src/ui/appState.test.ts`, `src/ui/protection.test.ts`.

## Non fait

## Captures

- `docs/screenshots/chiffrement-du-classeur-par-mot-de-passe/chiffrer-clair.png` : boîte de chiffrement (thème clair).
- `docs/screenshots/chiffrement-du-classeur-par-mot-de-passe/chiffrer-sombre.png` : boîte de chiffrement (thème sombre).
- `docs/screenshots/chiffrement-du-classeur-par-mot-de-passe/deverrouiller-clair.png` : boîte « Classeur protégé » à l'ouverture (clair).
- `docs/screenshots/chiffrement-du-classeur-par-mot-de-passe/deverrouiller-sombre.png` : boîte « Classeur protégé » à l'ouverture (sombre).

## Decisions

- Indicateur : texte « (chiffré) » dans le titre de fenêtre (barre de titre Tauri), pas de nouvelle icône dans le chrome (règle ANGELO : aucun élément décoratif). Pas de capture : le titre de fenêtre n'apparaît pas dans une capture Playwright de la page.
- Le design `docs/design/2026-10-25-204816.html` traite de la valeur cible, pas du chiffrement : non utilisé.

- Autosave : aucun changement de code, `writeDoc` passait déjà le mot de passe ; seul le test manquait.

- Le design `docs/design/2026-10-25-200330.html` traite de l'analyse what-if (valeur cible, scénarios, espion), pas du chiffrement : pas de construction dessus.
- Le chemin `src/ui/PasswordDialog.tsx` du brief n'existe pas (projet TypeScript DOM sans JSX) : la boîte est `src/ui/dialogs/password.ts`, sur le modèle de `dialog.ts`.
- Le mot de passe n'est jamais écrit dans le fichier ni persisté : il vit en mémoire pour la session.
- Libellés : le menu est plat (pas d'« Informations > Protéger le classeur » dans la barre), donc « Chiffrer avec mot de passe… » et « Retirer le mot de passe » directement sous Fichier.
- Format : PBKDF2-SHA256 (310 000 itérations, sel 16 octets) + AES-GCM 256 (IV 12 octets). Paramètres dans l'enveloppe.
- Mauvais mot de passe et fichier altéré renvoient le même message (AES-GCM ne les distingue pas). Le fichier n'est réécrit qu'à l'enregistrement : un échec ne corrompt rien.
- « Retirer » enregistre immédiatement en clair ; si l'enregistrement est annulé, le mot de passe est restauré.

## Preuves
- Tests : ok (242 tests, tests lies aux fichiers modifies)
- Typecheck : ok
- Captures : aucune annoncee
<!-- boucle-proof {"tests":{"ok":true,"count":242,"scope":"related"},"tsc":{"ok":true}} -->
