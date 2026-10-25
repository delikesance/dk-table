/**
 * Chiffrement d'un fichier `.dktable` par mot de passe (Web Crypto, aucune dépendance).
 * Clé : PBKDF2-SHA256 (sel aléatoire) ; contenu : AES-GCM 256 (IV aléatoire, tag d'authenticité).
 * L'enveloppe est du JSON lisible (`format: "dktable-encrypted"`) qui porte les paramètres
 * pour pouvoir les changer plus tard. Sans le mot de passe, le contenu est irrécupérable.
 */

/** Marque de l'enveloppe : seul champ lu pour reconnaître un fichier chiffré. */
const FORMAT = "dktable-encrypted";
/** Itérations PBKDF2 (recommandation OWASP pour SHA-256, stockées dans l'enveloppe). */
const ITERATIONS = 310_000;

/** Mot de passe refusé : mauvais mot de passe ou fichier altéré (AES-GCM ne les distingue pas). */
export class WrongPasswordError extends Error {
  constructor() {
    super("Mot de passe incorrect ou fichier altéré");
    this.name = "WrongPasswordError";
  }
}

/** Forme JSON de l'enveloppe chiffrée. */
interface Envelope {
  format: typeof FORMAT;
  version: 1;
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: number; salt: string };
  cipher: { name: "AES-GCM"; iv: string };
  data: string;
}

/** Octets -> base64 (chaîne binaire via btoa). */
function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** Base64 -> octets. */
function fromB64(text: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(atob(text).split("").map((c) => c.charCodeAt(0)));
}

/** Dérive la clé AES-GCM du mot de passe et du sel. */
async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** True when `text` is an encrypted `.dktable` envelope (plain JSON documents are not). */
export function isEncryptedText(text: string): boolean {
  try {
    const data = JSON.parse(text) as { format?: unknown };
    return typeof data === "object" && data !== null && data.format === FORMAT;
  } catch {
    return false;
  }
}

/** Chiffre `plain` avec `password` ; retourne le texte de l'enveloppe JSON. */
export async function encryptText(plain: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  const env: Envelope = {
    format: FORMAT,
    version: 1,
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: ITERATIONS, salt: toB64(salt) },
    cipher: { name: "AES-GCM", iv: toB64(iv) },
    data: toB64(new Uint8Array(cipher)),
  };
  return JSON.stringify(env, null, 2);
}

/** Déchiffre une enveloppe avec `password` ; lève `WrongPasswordError` si le mot de passe ne convient pas. */
export async function decryptText(text: string, password: string): Promise<string> {
  const env = JSON.parse(text) as Envelope;
  const key = await deriveKey(password, fromB64(env.kdf.salt), env.kdf.iterations);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(env.cipher.iv) }, key, fromB64(env.data));
    return new TextDecoder().decode(plain);
  } catch {
    throw new WrongPasswordError();
  }
}
