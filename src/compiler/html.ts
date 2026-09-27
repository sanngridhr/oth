import { inspect } from "util";

import { type AnnotatedString, type ASTNode, ASTNodeKind } from "@/parser/parser.js";

import type { Compiler } from "./compiler.js";

class HTMLCompiler implements Compiler {
  compile(ast: ASTNode[]): string {
    return "<!DOCTYPE html><html>" + this.compileBody(ast) + "</html>";
  }

  protected compileBody(ast: ASTNode[]): string {
    const innerHTML: string = ast
      .filter((node: ASTNode): boolean => node.kind != ASTNodeKind.Setting)
      .map((node: ASTNode): string => this.compileElement(node))
      .join("");

    return "<body>" + innerHTML + "</body>";
  }

  protected compileElement(node: ASTNode): string {
    switch (node.kind) {
      case ASTNodeKind.Comment:
        return "<!-- " + node.content + " -->";
      case ASTNodeKind.Headline:
        return `<h${node.level}>` + this.formatText(node.content) + `</h${node.level}>`;
      case ASTNodeKind.List:
        return this.compileList(node);
      case ASTNodeKind.Paragraph:
        return "<p>" + this.formatText(node.content) + "</p>";
      case ASTNodeKind.Table:
        return this.compileTable(node);
      case ASTNodeKind.Footnote:
        return "TODO: implement footnotes";
    }

    throw new Error(
      `Internal element ${inspect(node)} should not be in the top-level of parsed AST. Something went wrong.`
    );
  }

  protected compileList(list: Extract<ASTNode, { kind: ASTNodeKind.List }>): string {
    const tag: string = list.ordered ? "ol" : "ul";
    const innerHTML: string = list.items.map(this.compileListItem.bind(this)).join("");

    return `<${tag}>` + innerHTML + `</${tag}>`;
  }

  protected compileListItem(item: Extract<ASTNode, { kind: ASTNodeKind.ListItem }>): string {
    const innerHTML: string = item.sublist
      ? this.formatText(item.content) + this.compileList(item.sublist)
      : this.formatText(item.content);
    const value: string = item.position ? ` value=${item.position}` : "";

    return `<li${value}>` + innerHTML + "</li>";
  }

  protected compileTable(table: Extract<ASTNode, { kind: ASTNodeKind.Table }>): string {
    const height: number = table.cells.length;
    const caption: string = table.caption ? "<caption>" + table.caption + "</caption>" : "";

    let tableHead = "",
      tableFoot = "";

    if (table.breaks.includes(0)) {
      tableHead = "<thead>" + this.compileTableRow(table.cells.shift()!, "th") + "</thead>";
    }

    if (table.breaks.includes(height - 2)) {
      tableFoot = "<tfoot>" + this.compileTableRow(table.cells.pop()!, "td") + "</tfoot>";
    }

    const tableBody: string =
      "<tbody>"
      + table.cells
        .map((row: AnnotatedString[]): string => this.compileTableRow(row, "td"))
        .join("")
      + "</tbody>";

    return "<table>" + caption + tableHead + tableBody + tableFoot + "</table>";
  }

  protected compileTableRow(row: AnnotatedString[], tag: string): string {
    const innerHTML: string = row
      .map((cell: AnnotatedString): string => `<${tag}>` + this.formatText(cell) + `</${tag}>`)
      .join("");

    return `<tr>` + innerHTML + "</tr>";
  }

  protected formatText({ text: text, annotation: annotation }: AnnotatedString): string {
    return (
      text
      + (annotation && annotation.length > 0
        ? `<!-- ${annotation.map((x) => x.kind).join()} -->`
        : "")
    );
  }
}

export default HTMLCompiler;
