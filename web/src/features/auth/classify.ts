/**
 * Pages-offline classifier. Same hashes as legacy gate.js.
 * This is not access control — anyone can read the hashes or set localStorage.
 */
const STAFF_EMAIL = ["5edfa2692bdacc5e6ee805c626c50cb44cebb065f092d9a1067d89f74dacd326"];
const STAFF_PASS = ["270baedc320ae2d1864177af4a647ec1da71d3df577894028102bf91abc13c25"];
const DEMO_EMAIL = [
  "f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a",
  "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
];
const DEMO_PASS = [
  "ecd71870d1963316a97e3ac3408c9835ad8cf0f3c1bc703527c30265534f75ae",
  "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
];

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function digest(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) return "";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return toHex(buf);
}

export async function classify(email: string, password: string): Promise<{ staff: boolean; demo: boolean }> {
  const e = email.trim().toLowerCase();
  const p = password.trim();
  const [emailHash, passHash] = await Promise.all([digest(e), digest(p)]);
  return {
    staff: STAFF_EMAIL.includes(emailHash) && STAFF_PASS.includes(passHash),
    demo: DEMO_EMAIL.includes(emailHash) && DEMO_PASS.includes(passHash),
  };
}
