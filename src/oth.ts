import "@/util/Map.prototype.getOrInsertComputed.js"

import { match } from "ts-pattern";

import { type Compiler, CompilerType } from "@/compiler/compiler.js";
import HTMLCompiler from "@/compiler/html.js";
import { type ASTNode, type Parser, type ParserOptions } from "@/parser/parser.js";
import { ParserType } from "@/parser/parser.js";
import RegexParser from "@/parser/regex.js";

class OTH {
  private readonly parser: Parser;
  private readonly _compilers: Map<CompilerType, Compiler> = new Map<CompilerType, Compiler>();

  private compiler(type: CompilerType): Compiler {
    return this._compilers.getOrInsertComputed(type, (type: CompilerType): Compiler =>
      match(type)
        .with(CompilerType.HTML, (): HTMLCompiler => new HTMLCompiler())
        .with(CompilerType.Markdown, (): never => {
          throw new Error(`Markdown compilation is not implemented yet.`);
        })
        .exhaustive()
    );
  }

  constructor(parser: ParserOptions = {}) {
    this.parser = match(parser?.type ?? ParserType.Regex)
      .with(ParserType.Regex, () => new RegexParser(parser))
      .exhaustive();
  }

  to_html(org: string): string {
    const ast: ASTNode[] = this.parser.parse(org);
    const html: string = this.compiler(CompilerType.HTML).compile(ast);

    return html;
  }
}

export default OTH;
