export enum ASTKind {
  Comment = "comment",
  Empty = "empty",
  Headline = "headline",
  List = "list",
  ListItem = "list item",
  Paragraph = "paragraph",
  Setting = "setting",
  Table = "table",
  TableBreak = "table break",
}

export type ASTNode =
  | { kind: ASTKind.Comment; content: string }
  | { kind: ASTKind.Empty }
  | { kind: ASTKind.Headline; level: number; content: string }
  | {
      kind: ASTKind.List;
      level: number;
      ordered: boolean;
      items: ASTListItemNode[];
    }
  | {
      kind: ASTKind.ListItem;
      level: number;
      ordered: boolean;
      content: string;
      sublist?: ASTListNode;
      position?: number;
    }
  | { kind: ASTKind.Paragraph; content: string }
  | { kind: ASTKind.Setting; rule: string; content?: string }
  | { kind: ASTKind.Table; caption?: string; cells: string[][]; breaks: number[] }
  | { kind: ASTKind.TableBreak };

export type ASTListNode = Extract<ASTNode, { kind: ASTKind.List }>;
export type ASTListItemNode = Extract<ASTNode, { kind: ASTKind.ListItem }>;
export type ASTTableNode = Extract<ASTNode, { kind: ASTKind.Table }>;
export type ASTTableBreakNode = Extract<ASTNode, { kind: ASTKind.TableBreak }>;

class Parser {
  // Settings
  private readonly tabSize: number;
  private readonly keepComments: boolean;

  constructor(tabSize?: number, keepComments?: boolean) {
    this.tabSize = tabSize ?? 4;
    this.keepComments = keepComments ?? false;
  }

  // Constants
  private readonly rules: [RegExp, (ms: string[], line: string) => ASTNode][] = [
    [/^$/, (): ASTNode => ({ kind: ASTKind.Empty })],
    [
      /^(\*+) (.+)$/,
      (ms: string[]): ASTNode => ({
        kind: ASTKind.Headline,
        level: ms[0]!.length,
        content: ms[1]!,
      }),
    ],
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
    [/^# (.+)$/, (ms: string[]): ASTNode => ({ kind: ASTKind.Comment, content: ms[0]! })],
    [
      /^#\+(.+?)(: (.+))?$/,
      (ms: string[]): ASTNode => ({
        kind: ASTKind.Setting,
        rule: ms[0]!,
        content: ms[2],
      }),
    ],
    [/^\|[-|]+\|$/, (): ASTNode => ({ kind: ASTKind.TableBreak })],
    [
      /^\|(.+)\|$/,
      (_: string[], line: string): ASTNode => ({
        kind: ASTKind.Table,
        cells: [[...line.matchAll(/\| *([^|]+?) *(?=\|)/g).map((m) => m[1]!)]],
        breaks: [],
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

  parse(org: string) {
    const lines: ASTNode[] = org
      .split("\n")
      .map(this.annotateLine.bind(this))
      .reduce(this.reduceLines.bind(this), [])
      .filter((l: ASTNode): boolean => l.kind != ASTKind.Empty);

    return lines;
  }

  protected annotateLine(line: string): ASTNode {
    for (const [rule, action] of this.rules) {
      const matches: string[] | null = rule.exec(line);
      if (matches != null) return action(matches.slice(1), line);
    }

    throw new Error(`Line '${line}' does not match any rules.`);
  }

  protected reduceLines(lines: ASTNode[], current: ASTNode): ASTNode[] {
    const last: ASTNode | undefined = lines.pop();

    switch (current.kind) {
      case ASTKind.Comment:
        if (!this.keepComments) {
          if (last != undefined) lines.push(last);
        } else if (last?.kind == ASTKind.Comment) {
          last.content += " " + current.content;
          lines.push(last);
        } else {
          if (last != undefined) lines.push(last);
          lines.push(current);
        }
        break;
      case ASTKind.Empty:
        if (last?.kind == ASTKind.Empty) {
          lines.push(current);
        } else {
          if (last != undefined) lines.push(last);
          lines.push(current);
        }
        break;
      case ASTKind.Headline:
        if (last != undefined) lines.push(last);
        lines.push(current);
        break;
      case ASTKind.ListItem:
        if (last?.kind == ASTKind.List) {
          function insertListItem(list: ASTListNode, item: ASTListItemNode): void {
            if (item.level == list.level) {
              list.items.push(item);
              return;
            }

            // item.level > list.level: descend into (or create) the last item's sublist
            const last: ASTListItemNode = list.items.at(-1)!;

            if (!last.sublist) {
              last.sublist = {
                kind: ASTKind.List,
                level: item.level,
                ordered: item.ordered,
                items: [],
              };
            }

            insertListItem(last.sublist, item);
          }

          insertListItem(last, current);
          lines.push(last);
        } else {
          if (last != undefined) lines.push(last);
          lines.push({
            kind: ASTKind.List,
            level: current.level,
            ordered: current.ordered,
            items: [current],
          });
        }
        break;
      case ASTKind.Paragraph:
        if (last?.kind == ASTKind.Paragraph) {
          last.content += " " + current.content;
          lines.push(last);
        } else {
          if (last != undefined) lines.push(last);
          lines.push(current);
        }
        break;
      case ASTKind.Table:
        if (last?.kind == ASTKind.Setting && last.rule == "CAPTION") {
          current.caption = last.content;
          lines.push(current);
        } else if (last?.kind == ASTKind.Table) {
          last.cells.push(current.cells.pop()!);
          lines.push(last);
        } else {
          if (last != undefined) lines.push(last);
          lines.push(current);
        }
        break;
      case ASTKind.TableBreak:
        if (last?.kind == ASTKind.Table) {
          last.breaks.push(last.cells.length - 1);
          lines.push(last);
        } else {
          if (last != undefined) lines.push(last);
          lines.push({ kind: ASTKind.Table, cells: [], breaks: [-1] });
        }
        break;
      default:
        if (last != undefined) lines.push(last);
        lines.push(current);
    }

    return lines;
  }

  protected reduceLines_(lines: ASTNode[], current: ASTNode): ASTNode[] {
    const last: ASTNode | undefined = lines.pop();
    if (current.kind == ASTKind.Table && last?.kind == ASTKind.Setting && last.rule == "CAPTION") {
      current.caption = last.content;
      lines.push(current);
    } else {
      if (last != undefined) lines.push(last);
      lines.push(current);
    }

    return lines;
  }

  protected getListLevel(prefix: string): number {
    const spaces: number = prefix.split(" ").length - 1;
    const tabs: number = prefix.split("\t").length - 1;

    return spaces + tabs * this.tabSize;
  }
}

export default Parser;
