export function hasModule(enabled: string[] | undefined, key: string) {
  return !!enabled?.includes(key);
}
