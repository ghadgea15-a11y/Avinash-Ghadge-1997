const fs = require('fs');
const ts = require('typescript');

const sourceCode = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

const sourceFile = ts.createSourceFile(
    'test.tsx',
    sourceCode,
    ts.ScriptTarget.Latest,
    true
);

function getErrors(node) {
    let errors = [];
    if (node.kind === ts.SyntaxKind.JsxElement || node.kind === ts.SyntaxKind.JsxSelfClosingElement || node.kind === ts.SyntaxKind.JsxFragment) {
       // Not traversing JSX thoroughly for this simple check
    }
    ts.forEachChild(node, child => {
       errors = errors.concat(getErrors(child));
    });
    return errors;
}

const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram(['src/components/screens/SuperAdminSubscriptionsScreen.tsx'], { noEmit: true, jsx: ts.JsxEmit.React }));

diagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
        const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
        console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
});

