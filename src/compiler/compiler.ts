import { inspect } from "util";

import type { ASTListItemNode, ASTListNode, ASTNode, ASTTableNode } from "../parser/parser.js";
import { ASTKind } from "../parser/parser.js";

class Compiler {
  compile(ast: ASTNode[]): string {
    return "<!DOCTYPE html><html>" + this.compileBody(ast) + "</html>";
  }

  protected compileBody(ast: ASTNode[]): string {
    const innerHTML: string = ast
      .filter((node: ASTNode): boolean => node.kind != ASTKind.Setting)
      .map((node: ASTNode): string => this.compileElement(node))
      .join("");

    return "<body>" + innerHTML + "</body>";
  }

  protected compileElement(node: ASTNode): string {
    switch (node.kind) {
      case ASTKind.Comment:
        return "<!-- " + node.content + " -->";
      case ASTKind.Headline:
        return `<h${node.level}>` + node.content + `</h${node.level}>`;
      case ASTKind.List:
        return this.compileList(node);
      case ASTKind.Paragraph:
        return "<p>" + node.content + "</p>";
      case ASTKind.Table:
        return this.compileTable(node);
    }

    throw new Error(
      `Internal element ${inspect(node)} should not be in the top-level of parsed AST. Something went wrong.`
    );
  }

  protected compileList(list: ASTListNode): string {
    const tag: string = list.ordered ? "ol" : "ul";
    const innerHTML: string = list.items.map(this.compileListItem.bind(this)).join("");

    return `<${tag}>` + innerHTML + `</${tag}>`;
  }

  protected compileListItem(item: ASTListItemNode): string {
    const innerHTML: string = item.sublist
      ? item.content + this.compileList(item.sublist)
      : item.content;
    const value: string = item.position ? ` value=${item.position}` : "";

    return `<li${value}>` + innerHTML + "</li>";
  }

  protected compileTable(table: ASTTableNode): string {
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
      + table.cells.map((row: string[]): string => this.compileTableRow(row, "td")).join("")
      + "</tbody>";

    return "<table>" + caption + tableHead + tableBody + tableFoot + "</table>";
  }

  protected compileTableRow(row: string[], tag: string): string {
    const innerHTML: string = row
      .map((cell: string): string => `<${tag}>` + cell + `</${tag}>`)
      .join("");

    return `<tr>` + innerHTML + "</tr>";
  }
}

export default Compiler;
