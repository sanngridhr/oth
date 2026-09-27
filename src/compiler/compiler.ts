import type { ASTNode } from "@/parser/parser.js";

export enum CompilerType {
  HTML = "html",
  Markdown = "markdown",
}

export interface Compiler {
  compile(ast: ASTNode[]): string;
}
