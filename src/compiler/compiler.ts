import type { ASTNode } from "@/parser/parser.js";

export enum CompilerType {
  HTML = "html",
  Markdown = "markdown",
}

export abstract class Compiler {
  abstract compile(ast: ASTNode[]): string;
}
