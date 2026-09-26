// Parser object
export enum ParserType {
  Regex = "regex",
}

export interface CommonParserOptions {
  type: ParserType;
  tabSize?: number;
  keepComments?: boolean;
}

export interface Parser {
  parse(org: string): ASTNode[];
}

// AST
export enum ASTNodeKind {
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
  | { kind: ASTNodeKind.Comment; content: string }
  | { kind: ASTNodeKind.Empty }
  | { kind: ASTNodeKind.Headline; level: number; content: string }
  | {
      kind: ASTNodeKind.List;
      level: number;
      ordered: boolean;
      items: Extract<ASTNode, { kind: ASTNodeKind.ListItem }>[];
    }
  | {
      kind: ASTNodeKind.ListItem;
      level: number;
      ordered: boolean;
      content: string;
      sublist?: Extract<ASTNode, { kind: ASTNodeKind.List }>;
      position?: number;
    }
  | { kind: ASTNodeKind.Paragraph; content: string }
  | { kind: ASTNodeKind.Setting; rule: string; content?: string }
  | { kind: ASTNodeKind.Table; caption?: string; cells: string[][]; breaks: number[] }
  | { kind: ASTNodeKind.TableBreak };
