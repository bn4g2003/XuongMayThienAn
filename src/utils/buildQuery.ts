// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildQueryParams(query: Record<string, any> = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "all") return;

    // Date range: { from, to }
    if (typeof value === "object" && value !== null && ("from" in value || "to" in value)) {
      if (value.from) params.append(`${key}[from]`, String(value.from));
      if (value.to) params.append(`${key}[to]`, String(value.to));
      return;
    }

    // Date object → ISO string
    if (value instanceof Date) {
      params.append(key, value.toISOString());
      return;
    }

    // Array → comma-joined string
    if (Array.isArray(value)) {
      params.append(key, value.join(","));
      return;
    }

    // Primitive
    params.append(key, String(value));
  });

  return params.toString();
}
