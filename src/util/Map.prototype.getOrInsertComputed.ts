export {}

declare global {
  interface Map<K, V> {
    getOrInsertComputed(key: K, fn: (key: K) => V): V
  }
}

if (!Map.prototype.getOrInsertComputed)
  Map.prototype.getOrInsertComputed = function <K, V>(
    this: Map<K, V>,
    key: K,
    fn: (key: K) => V
  ): V {
    if (!this.has(key)) this.set(key, fn(key));
    return this.get(key)!;
  };
