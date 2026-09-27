import { match, P } from "ts-pattern";

import type { AnnotatedString, ASTNode, ParserOptions, ParserType } from "./parser.js";
import { ASTNodeKind } from "./parser.js";

export interface RegexParserOptions extends ParserOptions {
  type?: ParserType.Regex;
}

class RegexParser {
  // Settings
  private readonly tabSize: number;
  private readonly keepComments: boolean;

  constructor(options: RegexParserOptions) {
    this.tabSize = options.tabSize ?? 4;
    this.keepComments = options.keepComments ?? false;
  }

  // Constants
  private readonly rules: [RegExp, (ms: string[], line: string) => ASTNode][] = [
    [/^$/, (): ASTNode => ({ kind: ASTNodeKind.Empty })],
    [
      /^(\*+) (.+)$/,
      (ms: string[]): ASTNode => ({
        kind: ASTNodeKind.Headline,
        level: ms[0]!.length,
        content: { text: ms[1]! },
      }),
    ],
    [
      /^([\t ]*)[-+*] (.+)$/,
      (ms: string[]): ASTNode => ({
        kind: ASTNodeKind.ListItem,
        level: this.getListLevel(ms[0]!),
        ordered: false,
        content: { text: ms[1]! },
      }),
    ],
    [
      /^([\t ]*)\d+[.)](?: \[@(\d+)\])? (.+)$/,
      (ms: string[]): ASTNode => {
        const posStr: string | undefined = ms.at(-2);
        const position: number | undefined =
          posStr && /\d+/.test(posStr) ? parseInt(posStr) : undefined;

        return {
          kind: ASTNodeKind.ListItem,
          level: this.getListLevel(ms[0]!),
          ordered: true,
          ...(position && { position }),
          content: { text: ms.at(-1)! },
        };
      },
    ],
    [/^# (.+)$/, (ms: string[]): ASTNode => ({ kind: ASTNodeKind.Comment, content: ms[0]! })],
    [
      /^#\+(.+?)(: (.+))?$/,
      (ms: string[]): ASTNode => ({
        kind: ASTNodeKind.Setting,
        rule: ms[0]!,
        content: ms[2],
      }),
    ],
    [/^\|[-|]+\|$/, (): ASTNode => ({ kind: ASTNodeKind.TableBreak })],
    [
      /^\|(.+)\|$/,
      (_: string[], line: string): ASTNode => ({
        kind: ASTNodeKind.Table,
        cells: [
          [
            ...line
              .matchAll(/\| *([^|]+?) *(?=\|)/g)
              .map((m: string[]): AnnotatedString => ({ text: m[1]! })),
          ],
        ],
        breaks: [],
      }),
    ],
    // Should be last, basically a catch-all
    [
      /^(.+)$/,
      (ms: string[]): ASTNode => ({
        kind: ASTNodeKind.Paragraph,
        content: { text: ms[0]! },
      }),
    ],
  ];

  parse = (org: string): ASTNode[] =>
    org
      .split("\n")
      .map(this.parseLine.bind(this))
      .reduce(this.reduceLines.bind(this), [])
      .map(this.annotateNode.bind(this))
      .filter((l: ASTNode): boolean => l.kind != ASTNodeKind.Empty);

  protected parseLine(line: string): ASTNode {
    for (const [rule, action] of this.rules) {
      const matches: string[] | null = rule.exec(line);
      if (matches != null) return action(matches.slice(1), line);
    }

    throw new Error(`Line '${line}' does not match any rules.`);
  }

  protected reduceLines(lines: ASTNode[], current: ASTNode): ASTNode[] {
    const last: ASTNode | undefined = lines.pop();

    switch (current.kind) {
      case ASTNodeKind.Comment:
        if (!this.keepComments) {
          if (last != undefined) lines.push(last);
        } else if (last?.kind == ASTNodeKind.Comment) {
          last.content += " " + current.content;
          lines.push(last);
        } else {
          if (last != undefined) lines.push(last);
          lines.push(current);
        }
        break;
      case ASTNodeKind.Empty:
        if (last?.kind == ASTNodeKind.Empty) {
          lines.push(current);
        } else {
          if (last != undefined) lines.push(last);
          lines.push(current);
        }
        break;
      case ASTNodeKind.Headline:
        if (last != undefined) lines.push(last);
        lines.push(current);
        break;
      case ASTNodeKind.ListItem:
        if (last?.kind == ASTNodeKind.List) {
          function insertListItem(
            list: Extract<ASTNode, { kind: ASTNodeKind.List }>,
            item: Extract<ASTNode, { kind: ASTNodeKind.ListItem }>
          ): void {
            if (item.level == list.level) {
              list.items.push(item);
              return;
            }

            // item.level > list.level: descend into (or create) the last item's sublist
            const last: Extract<ASTNode, { kind: ASTNodeKind.ListItem }> = list.items.at(-1)!;

            if (!last.sublist) {
              last.sublist = {
                kind: ASTNodeKind.List,
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
            kind: ASTNodeKind.List,
            level: current.level,
            ordered: current.ordered,
            items: [current],
          });
        }
        break;
      case ASTNodeKind.Paragraph:
        if (last?.kind == ASTNodeKind.Paragraph) {
          last.content.text += " " + current.content.text;
          lines.push(last);
        } else {
          if (last != undefined) lines.push(last);
          lines.push(current);
        }
        break;
      case ASTNodeKind.Table:
        if (last?.kind == ASTNodeKind.Setting && last.rule == "CAPTION") {
          current.caption = last.content;
          lines.push(current);
        } else if (last?.kind == ASTNodeKind.Table) {
          last.cells.push(current.cells.pop()!);
          lines.push(last);
        } else {
          if (last != undefined) lines.push(last);
          lines.push(current);
        }
        break;
      case ASTNodeKind.TableBreak:
        if (last?.kind == ASTNodeKind.Table) {
          last.breaks.push(last.cells.length - 1);
          lines.push(last);
        } else {
          if (last != undefined) lines.push(last);
          lines.push({ kind: ASTNodeKind.Table, cells: [], breaks: [-1] });
        }
        break;
      default:
        if (last != undefined) lines.push(last);
        lines.push(current);
    }

    return lines;
  }

  protected annotateNode = (node: ASTNode): ASTNode =>
    match(node)
      .with(
        { kind: P.union(ASTNodeKind.Headline, ASTNodeKind.ListItem, ASTNodeKind.Paragraph) },
        (node: Extract<ASTNode, { content: AnnotatedString }>): ASTNode => ({
          ...node,
          content: this.annotateString(node.content),
        })
      )
      .with(
        { kind: ASTNodeKind.Table },
        (node: Extract<ASTNode, { cells: AnnotatedString[][] }>): ASTNode => ({
          ...node,
          cells: node.cells.map((row: AnnotatedString[]) => row.map(this.annotateString)),
        })
      )
      .otherwise((node: ASTNode) => node);

  protected annotateString(string: AnnotatedString): AnnotatedString {
    return string;
  }

  protected getListLevel(prefix: string): number {
    const spaces: number = prefix.split(" ").length - 1;
    const tabs: number = prefix.split("\t").length - 1;

    return spaces + tabs * this.tabSize;
  }
}

export default RegexParser;
