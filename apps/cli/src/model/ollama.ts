export function isOllamaModel(ref: string): boolean {
  return ref.startsWith('ollama:');
}

export function ollamaModelName(ref: string): string {
  return ref.slice('ollama:'.length);
}
