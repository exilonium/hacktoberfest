const vscode = require("vscode");
const { roastCode, ROAST_LEVEL_ORDER, ROAST_LEVEL_LABELS } = require("./roaster");

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("code-roaster.roastMyCode", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return vscode.window.showErrorMessage("Open a file first, genius 💀");

      const code = editor.document.getText();
      const level = await pickRoastLevel();
      if (!level) return;

      await triggerRoast(code, level);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("code-roaster.roastSelection", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const code = editor.document.getText(editor.selection);
      if (!code.trim()) {
        return vscode.window.showErrorMessage("Select some code to roast first 🙄");
      }

      const level = await pickRoastLevel();
      if (!level) return;

      await triggerRoast(code, level);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("code-roaster.setRoastLevel", async () => {
      const level = await pickRoastLevel();
      if (!level) return;

      const config = vscode.workspace.getConfiguration("codeRoaster");
      await config.update("roastLevel", level, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`🔥 Roast level set to: ${ROAST_LEVEL_LABELS[level]}`);
    })
  );
}

async function pickRoastLevel() {
  const config = vscode.workspace.getConfiguration("codeRoaster");
  const savedLevel = config.get("roastLevel") || "medium";

  const items = [
    {
      label: "Use saved level",
      description: `Current setting: ${ROAST_LEVEL_LABELS[savedLevel] || savedLevel}`,
      detail: "Use your configured default roast intensity",
      level: savedLevel,
      picked: true,
    },
    ...ROAST_LEVEL_ORDER.map((level) => ({
      label: ROAST_LEVEL_LABELS[level],
      description: level === savedLevel ? "← current" : "",
      detail: getDetailForLevel(level),
      level,
    })),
  ];

  const selected = await vscode.window.showQuickPick(items, {
    title: "🔥 Choose Your Roast Intensity",
    placeHolder: "Pick how much damage you want",
    matchOnDescription: true,
    matchOnDetail: true,
    ignoreFocusOut: true,
  });

  return selected ? selected.level : null;
}

function getDetailForLevel(level) {
  const details = {
    mild: "Light jabs, like a disappointed but loving parent",
    medium: "Stand-up comedy roast — funny and helpful",
    spicy: "WWE commentary — over the top and dramatic",
    savage: "Gordon Ramsay meets code review — absolutely brutal",
    nuclear: "Psychological warfare — your code AND your soul get roasted",
    "existential-crisis": "⚠️ Warning: may cause career changes and existential dread",
  };

  return details[level] || "";
}

async function triggerRoast(code, level) {
  const config = vscode.workspace.getConfiguration("codeRoaster");
  const apiKey = config.get("apiKey");

  if (!apiKey) {
    return vscode.window.showErrorMessage(
      "Add your OpenAI API key in settings (codeRoaster.apiKey) 🔑"
    );
  }

  const levelLabel = ROAST_LEVEL_LABELS[level] || level;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `🔥 Roasting your code at ${levelLabel} level...`,
      cancellable: false,
    },
    async () => {
      try {
        const roast = await roastCode(code, apiKey, level);
        showRoastPanel(roast, level);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Roast failed: ${message}`);
      }
    }
  );
}

function showRoastPanel(roast, level) {
  const panel = vscode.window.createWebviewPanel(
    "codeRoaster",
    "🔥 Code Roast Results",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
    }
  );

  panel.webview.html = getRoastHTML(roast, level);

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message?.command === "copyRoast") {
      await vscode.env.clipboard.writeText(roast);
      vscode.window.showInformationMessage("Roast copied to clipboard.");
    }

    if (message?.command === "openSettings") {
      await vscode.commands.executeCommand("workbench.action.openSettings", "codeRoaster");
    }
  });
}

function getRoastHTML(roast, level) {
  const levelIndex = Math.max(0, ROAST_LEVEL_ORDER.indexOf(level));
  const levelLabel = ROAST_LEVEL_LABELS[level] || level;
  const progressPercent = ((levelIndex + 1) / ROAST_LEVEL_ORDER.length) * 100;

  const themes = {
    mild: { accent: "#4ade80", glow: "rgba(74, 222, 128, 0.28)", bg: "#081a16" },
    medium: { accent: "#fb923c", glow: "rgba(251, 146, 60, 0.3)", bg: "#180f06" },
    spicy: { accent: "#f97316", glow: "rgba(249, 115, 22, 0.35)", bg: "#1a0905" },
    savage: { accent: "#ff4500", glow: "rgba(255, 69, 0, 0.42)", bg: "#120000" },
    nuclear: { accent: "#a855f7", glow: "rgba(168, 85, 247, 0.42)", bg: "#0a0520" },
    "existential-crisis": { accent: "#ec4899", glow: "rgba(236, 72, 153, 0.42)", bg: "#11000f" },
  };

  const theme = themes[level] || themes.medium;
  const sanitizedRoast = escapeHtml(roast).replace(/\n/g, "<br>");
  const segments = ROAST_LEVEL_ORDER.map((_, index) => {
    const active = index <= levelIndex;
    return `<span class="segment ${active ? "active" : ""}"></span>`;
  }).join("");

  const levelIcons = ["😊", "🔥", "🌶️", "💀", "☢️", "🕳️"];
  const emoji = levelIcons[levelIndex] || "🔥";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');

    :root {
      --accent: ${theme.accent};
      --glow: ${theme.glow};
      --bg: ${theme.bg};
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      padding: 24px;
      font-family: 'Inter', sans-serif;
      color: #f8fafc;
      background:
        radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 28%),
        radial-gradient(circle at bottom right, var(--glow), transparent 30%),
        var(--bg);
    }

    .shell {
      max-width: 980px;
      margin: 0 auto;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 24px;
      background: rgba(4, 8, 20, 0.68);
      backdrop-filter: blur(18px);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
      overflow: hidden;
    }

    .hero {
      padding: 28px 28px 18px;
      background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
      border-bottom: 1px solid rgba(255,255,255,0.12);
    }

    .eyebrow {
      color: rgba(248, 250, 252, 0.72);
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 11px;
      margin-bottom: 10px;
    }

    h1 {
      margin: 0;
      font-size: clamp(28px, 3vw, 42px);
      line-height: 1.05;
      letter-spacing: -0.03em;
      background: linear-gradient(135deg, #fff, var(--accent));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 14px;
      align-items: center;
    }

    .badge {
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.06);
      color: #f8fafc;
      font-size: 12px;
      font-weight: 700;
    }

    .body {
      padding: 24px 28px 28px;
    }

    .damage-track {
      display: grid;
      grid-template-columns: repeat(${ROAST_LEVEL_ORDER.length}, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 22px;
    }

    .segment {
      height: 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.1);
    }

    .segment.active {
      background: var(--accent);
      box-shadow: 0 0 12px var(--glow);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 18px 0 18px;
    }

    button {
      border: 0;
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      transition: transform 160ms ease, opacity 160ms ease;
    }

    button:hover { transform: translateY(-1px); }

    .primary {
      color: #111827;
      background: linear-gradient(135deg, #fff, rgba(255,255,255,0.78));
    }

    .secondary {
      color: #f8fafc;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
    }

    .roast {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      line-height: 1.8;
      padding: 20px;
      border-radius: 18px;
      background: rgba(0,0,0,0.28);
      border: 1px solid rgba(255,255,255,0.08);
      white-space: normal;
    }

    .footer {
      margin-top: 18px;
      color: rgba(248,250,252,0.72);
      font-size: 12px;
    }

    .spark {
      position: absolute;
      inset: auto auto 18px 18px;
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,255,255,0.2), transparent 65%);
      filter: blur(6px);
      opacity: 0.45;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="spark"></div>
    <header class="hero">
      <div class="eyebrow">${escapeHtml(levelLabel)}</div>
      <h1>Your code got roasted</h1>
      <div class="meta">
        <span class="badge">${emoji} ${Math.round(progressPercent)}% intensity</span>
        <span class="badge">Copy-ready</span>
        <span class="badge">OpenAI + questionable life choices</span>
      </div>
    </header>

    <main class="body">
      <div class="damage-track">${segments}</div>

      <div class="actions">
        <button class="primary" onclick="copyRoast()">Copy roast</button>
        <button class="secondary" onclick="openSettings()">Open roast settings</button>
      </div>

      <div class="roast">${sanitizedRoast}</div>
      <div class="footer">Powered by Roast My Code. It hurts because it's useful.</div>
    </main>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function copyRoast() {
      vscode.postMessage({ command: 'copyRoast' });
    }

    function openSettings() {
      vscode.postMessage({ command: 'openSettings' });
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
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function deactivate() {}

module.exports = { activate, deactivate };