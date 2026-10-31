import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "crypto";

// AES-256-GCM for firms' AI API keys at rest. The key comes from AI_KEY_SECRET,
// or is derived from NEXTAUTH_SECRET so a fresh install works without extra
// setup. Rotating either secret makes stored keys unreadable (firms re-enter).
function masterKey(): Buffer {
  const explicit = process.env.AI_KEY_SECRET?.trim();
  if (explicit) return createHash("sha256").update(explicit).digest();
  const base = process.env.NEXTAUTH_SECRET;
  if (!base) throw new Error("AI_KEY_SECRET or NEXTAUTH_SECRET must be set to store AI keys");
  return Buffer.from(hkdfSync("sha256", base, "mohamik-ai-keys", "api-key-encryption", 32));
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decryptSecret(stored: string): string {
  const [version, iv, tag, data] = stored.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("unrecognised secret format");
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
