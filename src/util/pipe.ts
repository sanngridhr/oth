const pipe = <T>(v: T, ...fns: ((v: T) => T)[]): T =>
  fns.reduce((v: T, fn: (v: T) => T): T => fn(v), v);

export default pipe;
