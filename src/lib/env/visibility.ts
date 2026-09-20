const PUBLIC_ENVIRONMENT_PREFIX = "NEXT_PUBLIC_";

export type EnvironmentVisibility = "public" | "server-only";

export function classifyEnvironmentVariable(name: string): EnvironmentVisibility {
  const normalizedName = name.trim();

  if (normalizedName.length === 0) {
    throw new TypeError("Environment variable names must not be empty.");
  }

  return normalizedName.startsWith(PUBLIC_ENVIRONMENT_PREFIX) ? "public" : "server-only";
}
