import { match } from "ts-pattern";

import HTMLCompiler from "@/compiler/html.js";
import type { ASTNode, Parser } from "@/parser/parser.js";
import { ParserType } from "@/parser/parser.js";

import type { Compiler } from "./compiler/compiler.js";
import type { RegexParserOptions } from "./parser/regex.js";
import RegexParser from "./parser/regex.js";

enum CompilerType {
  HTML = "html",
  Markdown = "markdown",
}

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

  constructor(parserOptions: RegexParserOptions) {
    this.parser = match(parserOptions.type)
      .with(ParserType.Regex, () => new RegexParser(parserOptions))
      .exhaustive();
  }

  to_html(org: string): string {
    const ast: ASTNode[] = this.parser.parse(org);
    const html: string = this.compiler(CompilerType.HTML).compile(ast);

    return html;
  }
}

export default OTH;
