import type { ASTNode } from "@/parser/parser.js";

export interface Compiler {
  compile(ast: ASTNode[]): string;
}
