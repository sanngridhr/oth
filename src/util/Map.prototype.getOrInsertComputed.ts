const getOrInsertComputed = Map.prototype.getOrInsertComputed
  ? Map.prototype.getOrInsertComputed
  : function <K, V>(this: Map<K, V>, key: K, fn: (key: K) => V): V {
      if (!this.has(key)) {
        this.set(key, fn(key));
      }
      return this.get(key)!;
    };

export default getOrInsertComputed;
