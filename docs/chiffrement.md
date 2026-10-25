# Chiffrement du classeur par mot de passe

**Quoi** : un `.dktable` peut être chiffré. Sans le mot de passe, le contenu est irrécupérable.

**Pourquoi** : protéger un classeur sur disque ou partagé. Le mot de passe n'est jamais écrit dans le fichier.

## Usage (utilisateur)

- **Fichier > Chiffrer avec mot de passe…** : saisie deux fois, puis enregistrement chiffré.
- **Fichier > Retirer le mot de passe** : enregistre le classeur en clair.
- **Ouvrir** (ou un fichier récent) d'un classeur chiffré : boîte « Classeur protégé ». Un mauvais mot de passe affiche une erreur et ne remplace rien.
- Le mot de passe reste en mémoire pour la session (`src/ui/protection.ts`) : les enregistrements suivants restent chiffrés. Nouveau classeur ou réouverture le réinitialise.

## Format

Enveloppe JSON lisible : `format: "dktable-encrypted"`, `kdf` (PBKDF2-SHA256, 310 000 itérations, sel 16 octets), `cipher` (AES-GCM 256, IV 12 octets), `data` (base64, tag inclus). Les paramètres sont dans le fichier : on peut les renforcer sans changer le format.

## Code

- `src/io/crypto.ts` : Web Crypto, `encryptText`, `decryptText`, `isEncryptedText`, `WrongPasswordError`.
- `src/io/protected.ts` : `encodeDocument(doc, pw?)`, `decodeDocument(text, pw?)`, `PasswordRequiredError`.
- `src/io/files.ts` : `pickDocument`, `openPath(path, deps, pw?)`, `saveDocument`/`saveAs` acceptent le mot de passe.
- `src/ui/fileops.ts` : flux ouvrir / chiffrer / retirer (`openWithPassword`, `protectDoc`, `unprotectDoc`).
- `src/ui/dialogs/password.ts` : boîte mot de passe (`openPasswordDialog`).

## Limites

- Pas de récupération : un mot de passe oublié rend le fichier irrécupérable.
- Le chiffrement protège le fichier, pas la session ouverte (le classeur est déchiffré en mémoire).
- Le mot de passe n'est pas mémorisé d'une session à l'autre.
