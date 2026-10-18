const vscode = require("vscode");
const { roastCode } = require("./roaster");

const ROAST_LEVELS = ["mild", "medium", "savage"];

function activate(context) {
  // Roast entire file
  context.subscriptions.push(
    vscode.commands.registerCommand("code-roaster.roastMyCode", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return vscode.window.showErrorMessage("Open a file first, genius 💀");

      const code = editor.document.getText();
      await triggerRoast(code);
    })
  );

  // Roast selected code
  context.subscriptions.push(
    vscode.commands.registerCommand("code-roaster.roastSelection", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const code = editor.document.getText(selection);
      if (!code.trim()) return vscode.window.showErrorMessage("Select some code to roast first 🙄");

      await triggerRoast(code);
    })
  );
}

async function triggerRoast(code) {
  const config = vscode.workspace.getConfiguration("codeRoaster");
  const apiKey = config.get("apiKey");

  if (!apiKey) {
    return vscode.window.showErrorMessage(
      "Add your OpenAI API key in settings (codeRoaster.apiKey) 🔑"
    );
  }

  const roastLevel = await pickRoastLevel(config.get("roastLevel"));
  if (!roastLevel) return;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "🔥 Roasting your code..." },
    async () => {
      const roast = await roastCode(code, apiKey, roastLevel);
      showRoastPanel(roast, roastLevel);
    }
  );
}

async function pickRoastLevel(defaultLevel) {
  const selected = await vscode.window.showQuickPick(
    [
      {
        label: "Use saved level",
        description: `Current setting: ${defaultLevel || "medium"}`,
        value: defaultLevel || "medium",
      },
      ...ROAST_LEVELS.map((level) => ({
        label: level.charAt(0).toUpperCase() + level.slice(1),
        description: `${level} roast mode`,
        value: level,
      })),
    ],
    {
      placeHolder: "Choose how savage the roast should be",
      ignoreFocusOut: true,
    }
  );

  return selected?.value;
}

function showRoastPanel(roast, roastLevel) {
  const panel = vscode.window.createWebviewPanel(
    "codeRoaster",
    "🔥 Code Roast Results",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
    }
  );
  panel.webview.html = getRoastHTML(roast, roastLevel);

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message?.command === "copyRoast") {
      await vscode.env.clipboard.writeText(roast);
      vscode.window.showInformationMessage("Roast copied to clipboard.");
    }
  });
}

function getRoastHTML(roast, roastLevel) {
  const escapedRoast = escapeHtml(roast).replace(/\n/g, "<br>");
  const escapedLevel = escapeHtml(roastLevel || "medium");

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #1a1a1a; color: #fff; }
    h1 { color: #ff4500; margin-bottom: 4px; }
    .meta { color: #aaa; margin-bottom: 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
    .toolbar { margin: 16px 0; }
    button {
      background: #ff4500;
      color: white;
      border: none;
      padding: 10px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
    button:hover { filter: brightness(1.05); }
    .roast { background: #2a2a2a; padding: 15px; border-left: 4px solid #ff4500; border-radius: 4px; line-height: 1.8; font-size: 15px; }
    .footer { margin-top: 20px; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <h1>🔥 Your Code Got Roasted</h1>
  <div class="meta">Level: ${escapedLevel}</div>
  <div class="toolbar">
    <button onclick="copyRoast()">Copy roast</button>
  </div>
  <div class="roast">${escapedRoast}</div>
  <p class="footer">Powered by Code Roaster 🔥 — It hurts because it's true.</p>
  <script>
    const vscode = acquireVsCodeApi();
    function copyRoast() {
      vscode.postMessage({ command: 'copyRoast' });
    }
  </script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function deactivate() {}

module.exports = { activate, deactivate };
