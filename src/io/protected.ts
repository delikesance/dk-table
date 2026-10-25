/**
 * Texte d'un `.dktable` selon la protection : en clair (JSON) sans mot de passe, chiffré sinon.
 * Le décodage ne réécrit jamais le fichier : un échec ne touche donc pas au contenu sur disque.
 */
import { decryptText, encryptText, isEncryptedText } from "./crypto";
import { parse, serialize } from "./format";
import type { DktDoc } from "./types";

/** Le fichier est chiffré et aucun mot de passe n'a été fourni ; `path` est renseigné par `openPath`. */
export class PasswordRequiredError extends Error {
  constructor(public readonly path?: string) {
    super("Ce classeur est protégé par un mot de passe");
    this.name = "PasswordRequiredError";
  }
}

/** Texte à écrire pour `doc` : JSON en clair, ou enveloppe chiffrée si `password` est donné. */
export async function encodeDocument(doc: DktDoc, password?: string): Promise<string> {
  const plain = serialize(doc);
  return password ? encryptText(plain, password) : plain;
}

/** Document lu depuis `text` ; lève `PasswordRequiredError` ou `WrongPasswordError` pour un fichier chiffré. */
export async function decodeDocument(text: string, password?: string): Promise<DktDoc> {
  if (!isEncryptedText(text)) return parse(text);
  if (!password) throw new PasswordRequiredError();
  return parse(await decryptText(text, password));
}
