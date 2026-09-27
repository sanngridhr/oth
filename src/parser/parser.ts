// Parser object
export enum ParserType {
  Regex = "regex",
}

export interface ParserOptions {
  type?: ParserType;
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
  | { kind: ASTNodeKind.Headline; level: number; content: AnnotatedString }
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
      content: AnnotatedString;
      sublist?: Extract<ASTNode, { kind: ASTNodeKind.List }>;
      position?: number;
    }
  | { kind: ASTNodeKind.Paragraph; content: AnnotatedString }
  | { kind: ASTNodeKind.Setting; rule: string; content?: string }
  | { kind: ASTNodeKind.Table; caption?: string; cells: AnnotatedString[][]; breaks: number[] }
  | { kind: ASTNodeKind.TableBreak };

// Line formatting
export enum AnnotationKind {
  Break = "break",
  Footnote = "footnote",
  //\\//\\//
  Bold = "bold",
  Code = "code",
  Italic = "italic",
  StrikeThrough = "strike-through",
  Sub = "sub",
  Super = "super",
  Underlined = "underlined",
  Verbatim = "verbatim",
  //\\//\\//
  Image = "image",
  Link = "link",
}
export type StringAnnotation =
  | { kind: AnnotationKind.Break; point: number }
  | { kind: AnnotationKind.Footnote; point: number; name: string; }
  | { kind: AnnotationKind.Footnote; point: number; definition: string; }
  | {
      kind:
        | AnnotationKind.Bold
        | AnnotationKind.Code
        | AnnotationKind.Italic
        | AnnotationKind.StrikeThrough
        | AnnotationKind.Sub
        | AnnotationKind.Super
        | AnnotationKind.Underlined
        | AnnotationKind.Verbatim;
      start: number;
      end: number;
    }
  | {
      kind: AnnotationKind.Image | AnnotationKind.Link;
      url: string;
      start: number;
      end: number;
    };

export interface AnnotatedString {
  text: string;
  annotation?: StringAnnotation[];
}
