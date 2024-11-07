import type * as ts from 'typescript';

import path = require('node:path');
import config = require('@tsslint/config');
// import eslint = require('@tsslint/eslint');

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
		format: {
			/**
			 * @example
			 * ```diff
			 * interface MyInterface {
			 * -   prop: string,
			 * +   prop: string;
			 * }
			 * ```
			 */
			'interface-property-semicolon'({ typescript: ts, sourceFile, reportWarning }) {
				const { text } = sourceFile;
				ts.forEachChild(sourceFile, function visit(node) {
					if (ts.isInterfaceDeclaration(node)) {
						for (const member of node.members) {
							if (text[member.end - 1] !== ';') {
								reportWarning(
									`Interface properties should end with a semicolon.`,
									member.getStart(sourceFile),
									member.getEnd()
								).withFix(
									'Replace comma with semicolon',
									() => [{
										fileName: sourceFile.fileName,
										textChanges: [{
											newText: ';',
											span: {
												start: member.end - 1,
												length: 1,
											},
										}],
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
			'braces-around-statements'({ typescript: ts, sourceFile, reportWarning }) {
				ts.forEachChild(sourceFile, function visit(node) {
					if (ts.isIfStatement(node)) {
						if (!ts.isBlock(node.thenStatement)) {
							reportWithFix(node.thenStatement);
						}
						if (node.elseStatement && !ts.isIfStatement(node.elseStatement) && !ts.isBlock(node.elseStatement)) {
							reportWithFix(node.elseStatement);
						}
					}
					// @ts-expect-error
					else if ('statement' in node && ts.isStatement(node.statement)) {
						const statement = node.statement;
						if (!ts.isBlock(node.statement)) {
							reportWithFix(statement);
						}
					}
					ts.forEachChild(node, visit);
				});
				function reportWithFix(statement: ts.Statement) {
					reportWarning(
						`Statements should be wrapped in braces.`,
						statement.getStart(sourceFile),
						statement.getEnd()
					).withFix(
						'Add braces around the statement',
						() => [{
							fileName: sourceFile.fileName,
							textChanges: [
								{
									newText: isSameLine(statement)
										? ' {\n'
										: ' {',
									span: {
										start: statement.getFullStart(),
										length: 0,
									},
								},
								{
									newText: '\n}',
									span: {
										start:
											ts.getTrailingCommentRanges(
												sourceFile.text,
												statement.getEnd()
											)?.reverse()?.[0]?.end
											?? statement.getEnd(),
										length: 0,
									},
								}
							],
						}]
					);
				}
				function isSameLine(node: ts.Node) {
					return ts.getLineAndCharacterOfPosition(sourceFile, node.getFullStart()).line
						=== ts.getLineAndCharacterOfPosition(sourceFile, node.parent.getEnd()).line;
				}
			},
			/**
			 * @example
			 * ```diff
			 * - const foo = (bar) => {};
			 * + const foo = bar => {};
			 * ```
			 */
			'arrow-parens'({ typescript: ts, sourceFile, reportWarning }) {
				ts.forEachChild(sourceFile, function visit(node) {
					if (
						ts.isArrowFunction(node)
						&& node.parameters.length === 1
						&& !node.type
					) {
						const parameter = node.parameters[0];
						if (
							ts.isIdentifier(parameter.name)
							&& !parameter.type
							&& !parameter.dotDotDotToken
							&& !parameter.initializer
							&& sourceFile.text[parameter.getStart(sourceFile) - 1] === '('
							&& sourceFile.text[parameter.getEnd()] === ')'
						) {
							reportWarning(
								`Parentheses should be omitted.`,
								parameter.getStart(sourceFile),
								parameter.getEnd()
							).withFix(
								'Remove parentheses around the parameter',
								() => [{
									fileName: sourceFile.fileName,
									textChanges: [
										{
											newText: '',
											span: {
												start: parameter.getStart(sourceFile) - 1,
												length: 1,
											},
										},
										{
											newText: '',
											span: {
												start: parameter.getEnd(),
												length: 1,
											},
										}
									],
								}]
							);
						}
					}
					ts.forEachChild(node, visit);
				});
			},
			'need-format'({ typescript: ts, sourceFile, languageService, reportWarning }) {
				const textChanges = languageService.getFormattingEditsForDocument(sourceFile.fileName, {
					...ts.getDefaultFormatCodeSettings(),
					convertTabsToSpaces: false,
					tabSize: 4,
					indentSize: 4,
					indentStyle: ts.IndentStyle.Smart,
					newLineCharacter: '\n',
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
					semicolons: ts.SemicolonPreference.Ignore,
				});
				for (const textChange of textChanges) {
					const originalText = sourceFile.text.slice(textChange.span.start, textChange.span.start + textChange.span.length);
					if (originalText !== textChange.newText) {
						reportWarning(
							`The document is not formatted.`,
							textChange.span.start,
							textChange.span.start + textChange.span.length
						).withFix(
							'Format the file',
							() => [{
								fileName: sourceFile.fileName,
								textChanges: [textChange],
							}]
						);
					}
				}
			},
			'no-trailing-comma-in-function'({ typescript: ts, sourceFile, reportWarning }) {
				const { text } = sourceFile;
				ts.forEachChild(sourceFile, function visit(node) {
					if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node)) {
						const parameters = node.parameters;
						if (parameters.length > 0) {
							const lastParameter = parameters[parameters.length - 1];
							const nextCharIndex = lastParameter.end;
							if (text[nextCharIndex] === ',') {
								reportWarning(
									`The last parameter of a function should not have a trailing comma.`,
									lastParameter.getStart(sourceFile),
									lastParameter.getEnd()
								).withFix(
									'Remove trailing comma',
									() => [{
										fileName: sourceFile.fileName,
										textChanges: [{
											span: { start: nextCharIndex, length: 1 },
											newText: ''
										}]
									}]
								);
							}
						}
					}
					ts.forEachChild(node, visit);
				});
			},
			'no-trailing-comma-in-function-call'({ typescript: ts, sourceFile, reportWarning }) {
				const { text } = sourceFile;
				ts.forEachChild(sourceFile, function visit(node) {
					if (ts.isCallExpression(node)) {
						if (node.arguments.length > 0) {
							const lastArgument = node.arguments[node.arguments.length - 1];
							const nextCharIndex = lastArgument.end;
							if (text[nextCharIndex] === ',') {
								reportWarning(
									`The last argument of a function call should not have a trailing comma.`,
									lastArgument.getStart(sourceFile),
									lastArgument.getEnd()
								).withFix(
									'Remove trailing comma',
									() => [{
										fileName: sourceFile.fileName,
										textChanges: [{
											span: { start: nextCharIndex, length: 1 },
											newText: ''
										}]
									}]
								);
							}
						}
					}
					ts.forEachChild(node, visit);
				});
			},
			'no-unnecessary-parentheses'({ typescript: ts, sourceFile, reportWarning }) {
				ts.forEachChild(sourceFile, function visit(node) {
					if (ts.isParenthesizedExpression(node)) {
						if (
							ts.isIdentifier(node.expression)
							|| ts.isPropertyAccessExpression(node.expression)
							|| ts.isElementAccessExpression(node.expression)
							|| ts.isCallExpression(node.expression)
						) {
							const start = node.getStart(sourceFile);
							const end = node.getEnd();
							reportWarning(
								`Parentheses are unnecessary.`,
								start,
								end
							).withFix(
								'Remove parentheses',
								() => [{
									fileName: sourceFile.fileName,
									textChanges: [{
										span: { start, length: 1 },
										newText: '',
									}, {
										span: { start: end - 1, length: 1 },
										newText: '',
									}],
								}]
							);
						}
					}
					ts.forEachChild(node, visit);
				});
			},
		},
		workspace: {
			'missing-dependency'({ typescript: ts, sourceFile, reportError, languageServiceHost }) {
				const { noEmit } = languageServiceHost.getCompilationSettings();
				if (noEmit) {
					return;
				}
				const packageJsonPath = ts.findConfigFile(sourceFile.fileName, ts.sys.fileExists, 'package.json');
				if (!packageJsonPath) {
					return;
				}
				const packageJson = JSON.parse(ts.sys.readFile(packageJsonPath) ?? '');
				if (packageJson.private) {
					return;
				}
				const parentPackageJsonPath = ts.findConfigFile(path.dirname(path.dirname(packageJsonPath)), ts.sys.fileExists, 'package.json');
				const parentPackageJson = !!parentPackageJsonPath && parentPackageJsonPath !== packageJsonPath
					? JSON.parse(ts.sys.readFile(parentPackageJsonPath) ?? '')
					: {};
				ts.forEachChild(sourceFile, function visit(node) {
					if (
						ts.isImportDeclaration(node)
						&& !node.importClause?.isTypeOnly
						&& ts.isStringLiteral(node.moduleSpecifier)
						&& !node.moduleSpecifier.text.startsWith('./')
						&& !node.moduleSpecifier.text.startsWith('../')
					) {
						let moduleName = node.moduleSpecifier.text.split('/')[0];
						if (moduleName.startsWith('@')) {
							moduleName += '/' + node.moduleSpecifier.text.split('/')[1];
						}
						if (
							(
								packageJson.devDependencies?.[moduleName]
								|| parentPackageJson.dependencies?.[moduleName]
								|| parentPackageJson.devDependencies?.[moduleName]
								|| parentPackageJson.peerDependencies?.[moduleName]
							)
							&& !packageJson.dependencies?.[moduleName]
							&& !packageJson.peerDependencies?.[moduleName]
						) {
							reportError(
								`Module '${moduleName}' should be in the dependencies.`,
								node.getStart(sourceFile),
								node.getEnd()
							);
						}
					}
					ts.forEachChild(node, visit);
				});
			},
		},
		semantic: {
			/**
			 * @example
			 * ```diff
			 * - const type = CompilerDOM.NodeTypes.ELEMENT;
			 * + const type = 1 satisfies CompilerDOM.NodeTypes.ELEMENT;
			 * ```
			 */
			'prefer-satisfies-enum-value'({ typescript: ts, sourceFile, languageService, reportWarning }) {
				const program = languageService.getProgram();
				const checker = program.getTypeChecker();
	
				ts.forEachChild(sourceFile, function visit(node) {
					if (ts.isPropertyAccessExpression(node)) {
	
						const symbol = checker.getSymbolAtLocation(node.name);
						const decl = symbol?.valueDeclaration;
	
						if (decl && ts.isEnumMember(decl)) {
							const value = checker.getConstantValue(decl);
							const exp = node.getText(sourceFile);
							reportWarning(
								`prefer \`${value} satisfies ${exp}\` over \`${exp}\``,
								node.getStart(sourceFile),
								node.getEnd(),
							).withFix(
								`Add \`${value} satisfies \` before the expression`,
								() => [{
									fileName: sourceFile.fileName,
									textChanges: [{
										newText: `${value} satisfies `,
										span: {
											start: node.getStart(sourceFile),
											length: 0,
										},
									}],
								}],
							);
						}
					}
					ts.forEachChild(node, visit);
				});
			},
		},
		syntactic: {
			/**
			 * @example
			 * ```diff
			 * console.log(obj.prop); // used
			 * - obj.prop; // unused
			 * ```
			 */
			'no-unused-property-access'({ typescript: ts, sourceFile, reportWarning }) {
				ts.forEachChild(sourceFile, function visit(node) {
					if (ts.isPropertyAccessExpression(node)) {
						const parent = node.parent;
						if (ts.isExpressionStatement(parent)) {
							reportWarning(
								`Property '${node.name.text}' is accessed but not used.`,
								node.getStart(sourceFile),
								node.getEnd()
							).withFix(
								'Remove unused property access',
								() => [{
									fileName: sourceFile.fileName,
									textChanges: [
										{
											newText: '',
											span: {
												start: parent.getStart(sourceFile),
												length: parent.getEnd() - parent.getStart(sourceFile),
											},
										}
									],
								}]
							);
						}
					}
					ts.forEachChild(node, visit);
				});
			},
			'no-unused-variable-access'({ typescript: ts, sourceFile, reportWarning }) {
				ts.forEachChild(sourceFile, function visit(node) {
					if (ts.isIdentifier(node)) {
						const parent = node.parent;
						if (ts.isExpressionStatement(parent)) {
							reportWarning(
								`Variable '${node.text}' is accessed but not used.`,
								node.getStart(sourceFile),
								node.getEnd()
							).withFix(
								'Remove unused variable access',
								() => [{
									fileName: sourceFile.fileName,
									textChanges: [
										{
											newText: '',
											span: {
												start: parent.getStart(sourceFile),
												length: parent.getEnd() - parent.getStart(sourceFile),
											},
										}
									],
								}]
							);
						}
					}
					ts.forEachChild(node, visit);
				});
			},
			'no-async-without-await'({ typescript: ts, sourceFile, reportWarning }) {
				ts.forEachChild(sourceFile, function visit(node) {
					if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node)) {
						const awaitModifer = node.modifiers?.find(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword);
						if (awaitModifer && node.body) {
							let hasAwait = false;
							ts.forEachChild(node.body, function visit(node) {
								hasAwait ||= ts.isAwaitExpression(node);
								ts.forEachChild(node, visit);
							});
							if (!hasAwait) {
								reportWarning(
									`Function is declared as async but does not use await.`,
									awaitModifer.getStart(sourceFile),
									awaitModifer.getEnd()
								).withFix(
									'Remove async modifier',
									() => [{
										fileName: sourceFile.fileName,
										textChanges: [{
											span: {
												start: awaitModifer.getStart(sourceFile),
												length: awaitModifer.getEnd() - awaitModifer.getStart(sourceFile),
											},
											newText: ''
										}]
									}]
								);
							}
						}
					}
					ts.forEachChild(node, visit);
				});
			},
		},
	},
});
