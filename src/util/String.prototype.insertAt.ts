export {}

declare global {
  interface String {
    insertAt(inserted: unknown, index: number): string
  }
}

String.prototype.insertAt = function (this: string, inserted: unknown, index: number): string {
  const prefix: string = this.slice(0, index);
  const suffix: string = this.slice(index);

  return prefix + inserted + suffix;
};