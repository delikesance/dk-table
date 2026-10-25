/** Déclarations Node minimales (le tsconfig du projet n'inclut pas @types/node). */
declare const process: { argv: string[]; env: Record<string, string | undefined>; exit(code?: number): never };
declare module "node:child_process" {
  export function execFile(
    file: string, args: string[], opts: { maxBuffer: number },
    cb: (err: Error | null, stdout: string | Uint8Array) => void,
  ): unknown;
}
declare module "node:fs" {
  export function readFileSync(path: string | URL, enc: string): string;
  export function appendFileSync(path: string, data: string): void;
  export function existsSync(path: string): boolean;
}
