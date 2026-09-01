/** Allow only http(s), mailto, tel, and in-page hashes. Block javascript: and data:. */
export function safeUrl(raw: string): string {
  const value = raw.trim();
  if (value.startsWith("#") || value.startsWith("/")) return value;
  try {
    const url = new URL(value, "https://nn-finanz.invalid");
    const protocol = url.protocol.toLowerCase();
    if (protocol === "https:" || protocol === "http:" || protocol === "mailto:" || protocol === "tel:") {
      return value;
    }
  } catch {
    return "#";
  }
  return "#";
}
