var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/.pnpm/@tsslint+types@1.4.0/node_modules/@tsslint/types/index.js
var require_types = __commonJS({
  "node_modules/.pnpm/@tsslint+types@1.4.0/node_modules/@tsslint/types/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/.pnpm/@tsslint+config@1.4.0/node_modules/@tsslint/config/lib/plugins/ignore.js
var require_ignore = __commonJS({
  "node_modules/.pnpm/@tsslint+config@1.4.0/node_modules/@tsslint/config/lib/plugins/ignore.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.create = create;
    function create(cmd, reportsUnusedComments, reg = new RegExp(`//\\s*${cmd}\\b[ \\t]*(?<ruleId>\\S*)\\b`, "g"), completeReg1 = /^\s*\/\/(\s*)([\S]*)?$/, completeReg2 = new RegExp(`//\\s*${cmd}\\b[ \\t]*(\\S*)?$`)) {
      return ({ typescript: ts, languageService }) => {
        const reportedRulesOfFile = /* @__PURE__ */ new Map();
        const { getCompletionsAtPosition } = languageService;
        languageService.getCompletionsAtPosition = (fileName, position, ...rest) => {
          let result = getCompletionsAtPosition(fileName, position, ...rest);
          const sourceFile = languageService.getProgram()?.getSourceFile(fileName);
          if (!sourceFile) {
            return result;
          }
          const reportedRules = reportedRulesOfFile.get(fileName);
          const line = sourceFile.getLineAndCharacterOfPosition(position).line;
          const lineStart = sourceFile.getPositionOfLineAndCharacter(line, 0);
          const prefix = sourceFile.text.slice(lineStart, position);
          const matchCmd = completeReg1 ? prefix.match(completeReg1) : void 0;
          if (matchCmd) {
            const nextLineRules = reportedRules?.filter(([, reportedLine]) => reportedLine === line + 1) ?? [];
            const item = {
              name: cmd,
              insertText: matchCmd[1].length ? cmd : ` ${cmd}`,
              kind: ts.ScriptElementKind.keyword,
              sortText: "a",
              replacementSpan: matchCmd[2] ? {
                start: position - matchCmd[2].length,
                length: matchCmd[2].length
              } : void 0,
              labelDetails: {
                description: nextLineRules.length >= 2 ? `Ignore ${nextLineRules.length} issues in next line` : nextLineRules.length ? "Ignore 1 issue in next line" : void 0
              }
            };
            if (result) {
              result.entries.push(item);
            } else {
              result = {
                isGlobalCompletion: false,
                isMemberCompletion: false,
                isNewIdentifierLocation: false,
                entries: [item]
              };
            }
          } else if (reportedRules?.length) {
            const matchRule = completeReg2 ? prefix.match(completeReg2) : void 0;
            if (matchRule) {
              const visited = /* @__PURE__ */ new Set();
              for (const [ruleId] of reportedRules) {
                if (visited.has(ruleId)) {
                  continue;
                }
                visited.add(ruleId);
                const reportedLines = reportedRules.filter(([r]) => r === ruleId).map(([, l]) => l + 1);
                const item = {
                  name: ruleId,
                  kind: ts.ScriptElementKind.keyword,
                  sortText: ruleId,
                  replacementSpan: matchRule[1] ? {
                    start: position - matchRule[1].length,
                    length: matchRule[1].length
                  } : void 0,
                  labelDetails: {
                    description: `Reported in line${reportedLines.length >= 2 ? "s" : ""} ${reportedLines.join(", ")}`
                  }
                };
                if (result) {
                  result.entries.push(item);
                } else {
                  result = {
                    isGlobalCompletion: false,
                    isMemberCompletion: false,
                    isNewIdentifierLocation: false,
                    entries: [item]
                  };
                }
              }
            }
          }
          return result;
        };
        return {
          resolveDiagnostics(sourceFile, results) {
            if (!reportsUnusedComments && !results.some((error) => error.source === "tsslint")) {
              return results;
            }
            const disabledLines = /* @__PURE__ */ new Map();
            const disabledLinesByRules = /* @__PURE__ */ new Map();
            for (const comment of sourceFile.text.matchAll(reg)) {
              const line = sourceFile.getLineAndCharacterOfPosition(comment.index).line + 1;
              const ruleId = comment.groups?.ruleId;
              if (ruleId) {
                if (!disabledLinesByRules.has(ruleId)) {
                  disabledLinesByRules.set(ruleId, /* @__PURE__ */ new Map());
                }
                disabledLinesByRules.get(ruleId).set(line, {
                  start: comment.index,
                  end: comment.index + comment[0].length
                });
              } else {
                disabledLines.set(line, {
                  start: comment.index,
                  end: comment.index + comment[0].length
                });
              }
            }
            let reportedRules = reportedRulesOfFile.get(sourceFile.fileName);
            if (!reportedRules) {
              reportedRules = [];
              reportedRulesOfFile.set(sourceFile.fileName, reportedRules);
            }
            reportedRules.length = 0;
            results = results.filter((error) => {
              if (error.source !== "tsslint") {
                return true;
              }
              const line = sourceFile.getLineAndCharacterOfPosition(error.start).line;
              reportedRules.push([error.code, line]);
              if (disabledLines.has(line)) {
                disabledLines.get(line).used = true;
                return false;
              }
              const disabledLinesByRule = disabledLinesByRules.get(error.code);
              if (disabledLinesByRule?.has(line)) {
                disabledLinesByRule.get(line).used = true;
                return false;
              }
              return true;
            });
            if (reportsUnusedComments) {
              for (const state of disabledLines.values()) {
                if (!state.used) {
                  results.push({
                    file: sourceFile,
                    start: state.start,
                    length: state.end - state.start,
                    code: "tsslint:unused-ignore-comment",
                    messageText: `Unused ${cmd} comment.`,
                    source: "tsslint",
                    category: 1
                  });
                }
              }
              for (const disabledLinesByRule of disabledLinesByRules.values()) {
                for (const state of disabledLinesByRule.values()) {
                  if (!state.used) {
                    results.push({
                      file: sourceFile,
                      start: state.start,
                      length: state.end - state.start,
                      code: "tsslint:unused-ignore-comment",
                      messageText: `Unused ${cmd} comment.`,
                      source: "tsslint",
                      category: 1
                    });
                  }
                }
              }
            }
            return results;
          },
          resolveCodeFixes(sourceFile, diagnostic, codeFixes) {
            if (diagnostic.source !== "tsslint" || diagnostic.start === void 0) {
              return codeFixes;
            }
            const line = sourceFile.getLineAndCharacterOfPosition(diagnostic.start).line;
            codeFixes.push({
              fixName: cmd,
              description: `Ignore with ${cmd}`,
              changes: [
                {
                  fileName: sourceFile.fileName,
                  textChanges: [{
                    newText: `// ${cmd} ${diagnostic.code}
`,
                    span: {
                      start: sourceFile.getPositionOfLineAndCharacter(line, 0),
                      length: 0
                    }
                  }]
                }
              ]
            });
            return codeFixes;
          }
        };
      };
    }
  }
});

// node_modules/.pnpm/@tsslint+config@1.4.0/node_modules/@tsslint/config/index.js
var require_config = __commonJS({
  "node_modules/.pnpm/@tsslint+config@1.4.0/node_modules/@tsslint/config/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createIgnorePlugin = void 0;
    exports2.defineRule = defineRule;
    exports2.definePlugin = definePlugin;
    exports2.defineConfig = defineConfig;
    __exportStar(require_types(), exports2);
    var ignore_js_1 = require_ignore();
    Object.defineProperty(exports2, "createIgnorePlugin", { enumerable: true, get: function() {
      return ignore_js_1.create;
    } });
    function defineRule(rule) {
      return rule;
    }
    function definePlugin(plugin) {
      return plugin;
    }
    function defineConfig(config2) {
      return config2;
    }
  }
});

// index.ts
var path = require("node:path");
var config = require_config();
module.exports = config.defineConfig({
  rules: {
    // Waiting for https://github.com/volarjs/volar.js/commit/e242709a91e9d2919dc4fa59278dd266fd11e7a3 released
    // semantic: {
    // 	'no-unnecessary-type-assertion': eslint.convertRule(
    // 		require('./node_modules/@typescript-eslint/eslint-plugin/dist/rules/no-unnecessary-type-assertion').default,
    // 		[],
    // 		0 satisfies ts.DiagnosticCategory.Warning
    // 	),
    // },
    stylistic: {
      /**
       * @example
       * ```diff
       * interface MyInterface {
       * -   prop: string,
       * +   prop: string;
       * }
       * ```
       */
      "interface-property-semicolon"({ typescript: ts, sourceFile, reportWarning }) {
        const { text } = sourceFile;
        ts.forEachChild(sourceFile, function visit(node) {
          if (ts.isInterfaceDeclaration(node)) {
            for (const member of node.members) {
              if (text[member.end - 1] === ",") {
                reportWarning(
                  `Interface properties should end with a semicolon.`,
                  member.end - 1,
                  member.end
                ).withFix(
                  "Replace comma with semicolon",
                  () => [{
                    fileName: sourceFile.fileName,
                    textChanges: [{
                      newText: ";",
                      span: {
                        start: member.end - 1,
                        length: 1
                      }
                    }]
                  }]
                ).withDeprecated();
              } else if (text[member.end - 1] !== ";") {
                reportWarning(
                  `Interface properties should end with a semicolon.`,
                  member.end,
                  member.end
                ).withFix(
                  "Insert semicolon",
                  () => [{
                    fileName: sourceFile.fileName,
                    textChanges: [{
                      newText: ";",
                      span: {
                        start: member.end,
                        length: 0
                      }
                    }]
                  }]
                );
              }
            }
          }
          ts.forEachChild(node, visit);
        });
      },
      /**
       * @example
       * ```diff
       * - if (foo) bar();
       * + if (foo) {
       * +   bar();
       * + }
       * ```
       */
      "braces-around-statements"({ typescript: ts, sourceFile, reportWarning }) {
        ts.forEachChild(sourceFile, function visit(node) {
          if (ts.isIfStatement(node)) {
            if (!ts.isBlock(node.thenStatement)) {
              reportWithFix(node.thenStatement);
            }
            if (node.elseStatement && !ts.isIfStatement(node.elseStatement) && !ts.isBlock(node.elseStatement)) {
              reportWithFix(node.elseStatement);
            }
          } else if ("statement" in node && ts.isStatement(node.statement)) {
            const statement = node.statement;
            if (!ts.isBlock(node.statement)) {
              reportWithFix(statement);
            }
          }
          ts.forEachChild(node, visit);
        });
        function reportWithFix(statement) {
          reportWarning(
            `Statements should be wrapped in braces.`,
            statement.getStart(sourceFile),
            statement.getEnd()
          ).withFix(
            "Add braces around the statement",
            () => [{
              fileName: sourceFile.fileName,
              textChanges: [
                {
                  newText: isSameLine(statement) ? " {\n" : " {",
                  span: {
                    start: statement.getFullStart(),
                    length: 0
                  }
                },
                {
                  newText: "\n}",
                  span: {
                    start: ts.getTrailingCommentRanges(
                      sourceFile.text,
                      statement.getEnd()
                    )?.reverse()?.[0]?.end ?? statement.getEnd(),
                    length: 0
                  }
                }
              ]
            }]
          );
        }
        function isSameLine(node) {
          return ts.getLineAndCharacterOfPosition(sourceFile, node.getFullStart()).line === ts.getLineAndCharacterOfPosition(sourceFile, node.parent.getEnd()).line;
        }
      },
      /**
       * @example
       * ```diff
       * - const foo = (bar) => {};
       * + const foo = bar => {};
       * ```
       */
      "arrow-parens"({ typescript: ts, sourceFile, reportWarning }) {
        ts.forEachChild(sourceFile, function visit(node) {
          if (ts.isArrowFunction(node) && node.parameters.length === 1 && !node.type) {
            const parameter = node.parameters[0];
            if (ts.isIdentifier(parameter.name) && !parameter.type && !parameter.dotDotDotToken && !parameter.initializer && sourceFile.text[parameter.getStart(sourceFile) - 1] === "(" && sourceFile.text[parameter.getEnd()] === ")") {
              reportWarning(
                `Parentheses should be omitted.`,
                parameter.getStart(sourceFile),
                parameter.getEnd()
              ).withFix(
                "Remove parentheses around the parameter",
                () => [{
                  fileName: sourceFile.fileName,
                  textChanges: [
                    {
                      newText: "",
                      span: {
                        start: parameter.getStart(sourceFile) - 1,
                        length: 1
                      }
                    },
                    {
                      newText: "",
                      span: {
                        start: parameter.getEnd(),
                        length: 1
                      }
                    }
                  ]
                }]
              );
            }
          }
          ts.forEachChild(node, visit);
        });
      },
      "need-format"({ typescript: ts, sourceFile, languageService, reportWarning }) {
        const textChanges = languageService.getFormattingEditsForDocument(sourceFile.fileName, {
          ...ts.getDefaultFormatCodeSettings(),
          convertTabsToSpaces: false,
          tabSize: 4,
          indentSize: 4,
          indentStyle: ts.IndentStyle.Smart,
          newLineCharacter: "\n",
          insertSpaceAfterCommaDelimiter: true,
          insertSpaceAfterConstructor: false,
          insertSpaceAfterSemicolonInForStatements: true,
          insertSpaceBeforeAndAfterBinaryOperators: true,
          insertSpaceAfterKeywordsInControlFlowStatements: true,
          insertSpaceAfterFunctionKeywordForAnonymousFunctions: true,
          insertSpaceBeforeFunctionParenthesis: false,
          insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
          insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
          insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
          insertSpaceAfterOpeningAndBeforeClosingEmptyBraces: true,
          insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: false,
          insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: false,
          insertSpaceAfterTypeAssertion: false,
          placeOpenBraceOnNewLineForFunctions: false,
          placeOpenBraceOnNewLineForControlBlocks: false,
          semicolons: ts.SemicolonPreference.Ignore
        });
        for (const textChange of textChanges) {
          const originalText = sourceFile.text.slice(textChange.span.start, textChange.span.start + textChange.span.length);
          if (originalText !== textChange.newText) {
            reportWarning(
              `The document is not formatted.`,
              textChange.span.start,
              textChange.span.start + textChange.span.length
            ).withFix(
              "Format the file",
              () => [{
                fileName: sourceFile.fileName,
                textChanges: [textChange]
              }]
            );
          }
        }
      },
      "no-trailing-comma-in-function"({ typescript: ts, sourceFile, reportWarning }) {
        const { text } = sourceFile;
        ts.forEachChild(sourceFile, function visit(node) {
          if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node)) {
            const parameters = node.parameters;
            if (parameters.length > 0) {
              const lastParameter = parameters[parameters.length - 1];
              const nextCharIndex = lastParameter.end;
              if (text[nextCharIndex] === ",") {
                reportWarning(
                  `The last parameter of a function should not have a trailing comma.`,
                  lastParameter.getStart(sourceFile),
                  lastParameter.getEnd()
                ).withFix(
                  "Remove trailing comma",
                  () => [{
                    fileName: sourceFile.fileName,
                    textChanges: [{
                      span: { start: nextCharIndex, length: 1 },
                      newText: ""
                    }]
                  }]
                );
              }
            }
          }
          ts.forEachChild(node, visit);
        });
      },
      "no-trailing-comma-in-function-call"({ typescript: ts, sourceFile, reportWarning }) {
        const { text } = sourceFile;
        ts.forEachChild(sourceFile, function visit(node) {
          if (ts.isCallExpression(node)) {
            if (node.arguments.length > 0) {
              const lastArgument = node.arguments[node.arguments.length - 1];
              const nextCharIndex = lastArgument.end;
              if (text[nextCharIndex] === ",") {
                reportWarning(
                  `The last argument of a function call should not have a trailing comma.`,
                  lastArgument.getStart(sourceFile),
                  lastArgument.getEnd()
                ).withFix(
                  "Remove trailing comma",
                  () => [{
                    fileName: sourceFile.fileName,
                    textChanges: [{
                      span: { start: nextCharIndex, length: 1 },
                      newText: ""
                    }]
                  }]
                );
              }
            }
          }
          ts.forEachChild(node, visit);
        });
      },
      "no-unnecessary-parentheses"({ typescript: ts, sourceFile, reportWarning }) {
        ts.forEachChild(sourceFile, function visit(node) {
          if (ts.isParenthesizedExpression(node)) {
            if (ts.isIdentifier(node.expression) || ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression) || ts.isCallExpression(node.expression)) {
              const start = node.getStart(sourceFile);
              const end = node.getEnd();
              reportWarning(
                `Parentheses are unnecessary.`,
                start,
                end
              ).withFix(
                "Remove parentheses",
                () => [{
                  fileName: sourceFile.fileName,
                  textChanges: [{
                    span: { start, length: 1 },
                    newText: ""
                  }, {
                    span: { start: end - 1, length: 1 },
                    newText: ""
                  }]
                }]
              );
            }
          }
          ts.forEachChild(node, visit);
        });
      }
    },
    workspace: {
      "missing-dependency"({ typescript: ts, sourceFile, reportError, languageServiceHost }) {
        const { noEmit } = languageServiceHost.getCompilationSettings();
        if (noEmit) {
          return;
        }
        const packageJsonPath = ts.findConfigFile(sourceFile.fileName, ts.sys.fileExists, "package.json");
        if (!packageJsonPath) {
          return;
        }
        const packageJson = JSON.parse(ts.sys.readFile(packageJsonPath) ?? "");
        if (packageJson.private) {
          return;
        }
        const parentPackageJsonPath = ts.findConfigFile(path.dirname(path.dirname(packageJsonPath)), ts.sys.fileExists, "package.json");
        const parentPackageJson = !!parentPackageJsonPath && parentPackageJsonPath !== packageJsonPath ? JSON.parse(ts.sys.readFile(parentPackageJsonPath) ?? "") : {};
        ts.forEachChild(sourceFile, function visit(node) {
          if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly && ts.isStringLiteral(node.moduleSpecifier) && !node.moduleSpecifier.text.startsWith("./") && !node.moduleSpecifier.text.startsWith("../")) {
            let moduleName = node.moduleSpecifier.text.split("/")[0];
            if (moduleName.startsWith("@")) {
              moduleName += "/" + node.moduleSpecifier.text.split("/")[1];
            }
            if ((packageJson.devDependencies?.[moduleName] || parentPackageJson.dependencies?.[moduleName] || parentPackageJson.devDependencies?.[moduleName] || parentPackageJson.peerDependencies?.[moduleName]) && !packageJson.dependencies?.[moduleName] && !packageJson.peerDependencies?.[moduleName]) {
              reportError(
                `Module '${moduleName}' should be in the dependencies.`,
                node.getStart(sourceFile),
                node.getEnd()
              );
            }
          }
          ts.forEachChild(node, visit);
        });
      }
    },
    syntactic: {
      /**
       * @example
       * ```diff
       * console.log(obj.prop); // used
       * - obj.prop; // unused
       * ```
       */
      "no-unused-property-access"({ typescript: ts, sourceFile, reportWarning }) {
        ts.forEachChild(sourceFile, function visit(node) {
          if (ts.isPropertyAccessExpression(node)) {
            const parent = node.parent;
            if (ts.isExpressionStatement(parent)) {
              reportWarning(
                `Property '${node.name.text}' is accessed but not used.`,
                node.getStart(sourceFile),
                node.getEnd()
              ).withFix(
                "Remove unused property access",
                () => [{
                  fileName: sourceFile.fileName,
                  textChanges: [
                    {
                      newText: "",
                      span: {
                        start: parent.getStart(sourceFile),
                        length: parent.getEnd() - parent.getStart(sourceFile)
                      }
                    }
                  ]
                }]
              );
            }
          }
          ts.forEachChild(node, visit);
        });
      },
      "no-unused-variable-access"({ typescript: ts, sourceFile, reportWarning }) {
        ts.forEachChild(sourceFile, function visit(node) {
          if (ts.isIdentifier(node)) {
            const parent = node.parent;
            if (ts.isExpressionStatement(parent)) {
              reportWarning(
                `Variable '${node.text}' is accessed but not used.`,
                node.getStart(sourceFile),
                node.getEnd()
              ).withFix(
                "Remove unused variable access",
                () => [{
                  fileName: sourceFile.fileName,
                  textChanges: [
                    {
                      newText: "",
                      span: {
                        start: parent.getStart(sourceFile),
                        length: parent.getEnd() - parent.getStart(sourceFile)
                      }
                    }
                  ]
                }]
              );
            }
          }
          ts.forEachChild(node, visit);
        });
      },
      "no-async-without-await"({ typescript: ts, sourceFile, reportWarning }) {
        ts.forEachChild(sourceFile, function visit(node) {
          if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node)) {
            const awaitModifer = node.modifiers?.find((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword);
            if (awaitModifer && node.body) {
              let hasAwait = false;
              ts.forEachChild(node.body, function visit2(node2) {
                hasAwait ||= ts.isAwaitExpression(node2);
                ts.forEachChild(node2, visit2);
              });
              if (!hasAwait) {
                reportWarning(
                  `Function is declared as async but does not use await.`,
                  awaitModifer.getStart(sourceFile),
                  awaitModifer.getEnd()
                ).withFix(
                  "Remove async modifier",
                  () => [{
                    fileName: sourceFile.fileName,
                    textChanges: [{
                      span: {
                        start: awaitModifer.getStart(sourceFile),
                        length: awaitModifer.getEnd() - awaitModifer.getStart(sourceFile)
                      },
                      newText: ""
                    }]
                  }]
                );
              }
            }
          }
          ts.forEachChild(node, visit);
        });
      }
    }
  }
});
