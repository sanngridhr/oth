enum ASTKind {
  Comment = "comment",
  Empty = "empty",
  Headline = "headline",
  List = "list",
  ListItem = "list item",
  Paragraph = "paragraph",
  Setting = "setting",
  Table = "table",
}

type ASTNode =
  | { kind: ASTKind.Comment; content: string }
  | { kind: ASTKind.Empty }
  | { kind: ASTKind.Headline; level: number; content: string }
  | { kind: ASTKind.List; items: ListChild[] }
  | { kind: ASTKind.ListItem; level: number; ordered: boolean; position?: number; content: string }
  | { kind: ASTKind.Paragraph; content: string }
  | { kind: ASTKind.Setting; rule: string; content?: string }
  | { kind: ASTKind.Table; cells: string[][] };

type ListChild = Extract<ASTNode, { kind: ASTKind.List | ASTKind.ListItem }>;

class OTH {
  private readonly tabSize: number;
  private readonly rules: [RegExp, (ms: string[], line: string) => ASTNode][] = [
    [/^$/, (): ASTNode => ({ kind: ASTKind.Empty })],
    [
      /^([\t ]*)[-+*] (.+)$/,
      (ms: string[]): ASTNode => ({
        kind: ASTKind.ListItem,
        level: this.getListLevel(ms[0]!),
        ordered: false,
        content: ms[1]!,
      }),
    ],
    [
      /^([\t ]*)\d+[.)](?: \[@(\d+)\])? (.+)$/,
      (ms: string[]): ASTNode => {
        const posStr: string | undefined = ms.at(-2);
        const position: number | undefined =
          posStr && /\d+/.test(posStr) ? parseInt(posStr) : undefined;

        return {
          kind: ASTKind.ListItem,
          level: this.getListLevel(ms[0]!),
          ordered: true,
          ...(position && { position }),
          content: ms.at(-1)!,
        };
      },
    ],
    [
      /^(\*+) (.+)$/,
      (ms: string[]): ASTNode => ({
        kind: ASTKind.Headline,
        level: ms[0]!.length,
        content: ms[1]!,
      }),
    ],
    [/^# (.+)$/, (ms: string[]): ASTNode => ({ kind: ASTKind.Comment, content: ms[0]! })],
    [
      /^#\+(.+?)(: (.+))?$/,
      (ms: string[]): ASTNode => ({
        kind: ASTKind.Setting,
        rule: ms[0]!,
        content: ms[2],
      }),
    ],
    [
      /^\|(.+)\|$/,
      (_: string[], line: string): ASTNode => ({
        kind: ASTKind.Table,
        cells: [[...line.matchAll(/\| *([^|]+?) *(?=\|)/g).map((m) => m[1]!)]],
      }),
    ],
    // Should be last, basically a catch-all
    [
      /^(.+)$/,
      (ms: string[]): ASTNode => ({
        kind: ASTKind.Paragraph,
        content: ms[0]!,
      }),
    ],
  ];
  private static readonly reducable: ASTKind[] = [
    ASTKind.Comment,
    ASTKind.Empty,
    ASTKind.Paragraph,
    ASTKind.Table,
  ];

  constructor(tabSize?: number) {
    this.tabSize = tabSize ?? 4;
  }

  parse(org: string) {
    const lines: ASTNode[] = org
      .split("\n")
      .map(this.annotateLine.bind(this))
      .reduce(this.reduceLines, [])
      .filter((l) => l.kind != ASTKind.Empty);

    return lines;
  }

  protected annotateLine(line: string): ASTNode {
    for (const [rule, action] of this.rules) {
      const matches: string[] | null = rule.exec(line);
      if (matches !== null) return action(matches.slice(1), line);
    }

    throw new Error(`Line '${line}' does not match any rules.`);
  }

  protected reduceLines(lines: ASTNode[], current: ASTNode): ASTNode[] {
    const last: ASTNode | undefined = lines.at(-1);

    if (OTH.reducable.includes(current.kind) && last?.kind === current.kind) {
      const init: ASTNode[] = lines.slice(0, -1);

      switch (current.kind) {
        case ASTKind.Comment:
          // @ts-expect-error -- content is ensured by last.kind
          last.content += " " + current.content;
          break;
        case ASTKind.Empty:
          break;
        case ASTKind.Paragraph:
          // @ts-expect-error -- content is ensured by last.kind
          last.content += " " + current.content;
          break;
        case ASTKind.Table:
          // @ts-expect-error -- cells is ensured by last.kind
          last.cells.push(current.cells[0]);
      }

      init.push(last);
      return init;
    } else {
      lines.push(current);
      return lines;
    }
  }

  protected getListLevel(prefix: string): number {
    const spaces: number = prefix.split(" ").length - 1;
    const tabs: number = prefix.split("\t").length - 1;

    return spaces + tabs * this.tabSize;
  }
}

export default OTH;