import Compiler from "./compiler/compiler.js";
import Parser, { type ASTNode } from "./parser/parser.js";

class OTH {
  private readonly parser: Parser;
  private readonly compiler: Compiler = new Compiler();

  constructor(tabSize?: number) {
    this.parser = new Parser(tabSize);
  }

  parse(org: string): string {
    const ast: ASTNode[] = this.parser.parse(org);
    const html = this.compiler.compile(ast);

    return html;
  }
}

export default OTH;
