#!/usr/bin/env node
/**
 * 科学小游戏大冒险 · 无头浏览器冒烟与 SVG 重叠巡检 / 截图工具（零第三方依赖）
 *
 * 自动拉起本地静态服务 + 本机 Edge/Chrome (CDP)，逐页检查：
 *   1. 无未捕获异常 (Runtime.exceptionThrown) 与 console.error
 *   2. 页面成功渲染 <h1>
 *   3. 桌面 (1280×900) 与手机 (390×844) 零横向溢出
 *   4. 所有可见 SVG 内部 <text> 包围盒零重叠（自动捕获字压字 bug！）
 *   5. 传入 --shots [dir] 时额外导出高清 PNG 截图供视觉审查
 *
 * 用法：
 *   npm run smoke                           # 全量巡检：首页 + 9 大展馆 + 全部实验（桌面+手机）
 *   npm run smoke -- bridge gears           # 仅快速巡检指定游戏（单改游戏秒级验收！）
 *   npm run smoke -- hub cat:earth bridge --shots tmp-shots
 *   npm run shots -- bridge --out tmp-shots # 快捷截图模式
 */
import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { categories } from "../src/catalog/categories.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = path.join(ROOT, "dist");
const BASE_PREFIX = "/sci-playground";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon"
};

function findBrowser() {
  const envBin = process.env.BROWSER_BIN || process.env.CHROME_PATH;
  if (envBin && fs.existsSync(envBin)) return envBin;

  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          path.join(process.env.LOCALAPPDATA ?? "", "Microsoft\\Edge\\Application\\msedge.exe"),
          path.join(process.env.LOCALAPPDATA ?? "", "Google\\Chrome\\Application\\chrome.exe")
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
          ]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/microsoft-edge",
            "/usr/bin/chromium-browser",
            "/usr/bin/chromium"
          ];

  for (const bin of candidates) {
    if (bin && fs.existsSync(bin)) return bin;
  }
  throw new Error("未找到本机 Edge 或 Chrome，请通过环境变量 BROWSER_BIN 指定浏览器可执行文件路径。");
}

function listAllGameIds() {
  const catalogText = fs.readFileSync(path.join(ROOT, "src", "catalog", "games.ts"), "utf8");
  const ids = [];
  for (const m of catalogText.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
    const entry = path.resolve(path.join(ROOT, "src", "catalog"), m[1]);
    if (!entry.includes(`${path.sep}games${path.sep}`)) continue;
    const text = fs.readFileSync(entry, "utf8");
    const metaBlock = text.match(/meta\s*:\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? "";
    const id = metaBlock.match(/\bid\s*:\s*["']([^"']+)["']/)?.[1];
    if (id) ids.push(id);
  }
  return ids;
}

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = (req.url || "/").split("?")[0];
      if (urlPath === "/" || urlPath === BASE_PREFIX) urlPath = `${BASE_PREFIX}/index.html`;
      if (urlPath.startsWith(`${BASE_PREFIX}/`)) {
        urlPath = urlPath.slice(BASE_PREFIX.length);
      }
      const safeRel = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
      let filePath = path.join(DIST_DIR, safeRel);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

function launchCdpBrowser(bin, userDataDir) {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--mute-audio",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${userDataDir}`,
      "--remote-debugging-port=0",
      "about:blank"
    ];
    if (process.platform === "linux") args.unshift("--no-sandbox", "--disable-dev-shm-usage");

    const proc = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => reject(new Error(`启动浏览器超时: ${stderr}`)), 15000);
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) {
        clearTimeout(timer);
        resolve({ proc, wsUrl: m[1] });
      }
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

class CdpSession {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.seq;
    const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }
}

const INSPECT_DOM_EXPR = `(() => {
  const h1 = document.querySelector("h1")?.textContent?.trim() || "";
  const overflowX = document.documentElement.scrollWidth - window.innerWidth;
  const overlaps = [];
  for (const svg of document.querySelectorAll("svg")) {
    const sr = svg.getBoundingClientRect();
    if (sr.width < 40 || sr.height < 40) continue;
    const texts = [...svg.querySelectorAll("text")]
      .map((el) => {
        const r = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          text: (el.textContent || "").trim(),
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
          opacity: Number(style.opacity || "1"),
          display: style.display
        };
      })
      .filter((t) => t.text.length > 0 && t.width > 2 && t.height > 2 && t.opacity > 0.05 && t.display !== "none");

    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i];
        const b = texts[j];
        const ow = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oh = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ow > 5 && oh > 5) {
          overlaps.push(\`"\${a.text}" 与 "\${b.text}" 重叠 (\${Math.round(ow)}×\${Math.round(oh)}px)\`);
        }
      }
    }
  }
  return { h1, overflowX, overlaps };
})()`;

function parseTargets(args) {
  const positional = [];
  let shotsDir = null;
  let skipBuild = false;
  let desktopOnly = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--shots" || arg === "--out") {
      shotsDir = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : "tmp-shots";
    } else if (arg === "--no-build") {
      skipBuild = true;
    } else if (arg === "--build") {
      skipBuild = false;
    } else if (arg === "--desktop-only") {
      desktopOnly = true;
    } else if (!arg.startsWith("--")) {
      positional.push(arg);
    }
  }

  const allGameIds = listAllGameIds();
  const routes = [];
  if (positional.length === 0) {
    routes.push({ name: "hub", hash: "#/" });
    for (const c of categories) routes.push({ name: `cat-${c.id}`, hash: `#/c/${c.id}` });
    for (const id of allGameIds) routes.push({ name: id, hash: `#/g/${id}` });
  } else {
    for (const token of positional) {
      if (token === "hub" || token === "#/") routes.push({ name: "hub", hash: "#/" });
      else if (token.startsWith("cat:")) routes.push({ name: `cat-${token.slice(4)}`, hash: `#/c/${token.slice(4)}` });
      else if (token.startsWith("#/")) routes.push({ name: token.replace(/[^a-z0-9-]+/gi, "_"), hash: token });
      else routes.push({ name: token, hash: `#/g/${token}` });
    }
  }

  return { routes, shotsDir, skipBuild, desktopOnly };
}

async function main() {
  const { routes, shotsDir, skipBuild, desktopOnly } = parseTargets(process.argv.slice(2));

  if (!skipBuild || !fs.existsSync(path.join(DIST_DIR, "index.html"))) {
    console.log("📦 正在构建生产包 (npm run build)...");
    execSync("npm run build", { cwd: ROOT, stdio: "inherit" });
  }

  if (shotsDir) fs.mkdirSync(path.resolve(ROOT, shotsDir), { recursive: true });

  const browserBin = findBrowser();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "sci-smoke-"));
  const { server, port } = await startStaticServer();
  const { proc, wsUrl } = await launchCdpBrowser(browserBin, userDataDir);

  const failures = [];
  try {
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.addEventListener("open", res, { once: true });
      ws.addEventListener("error", rej, { once: true });
    });
    const cdp = new CdpSession(ws);
    const { targetInfos } = await cdp.send("Target.getTargets");
    const pageTarget = targetInfos.find((t) => t.type === "page");
    const { sessionId } = await cdp.send("Target.attachToTarget", {
      targetId: pageTarget.targetId,
      flatten: true
    });

    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);

    const viewports = desktopOnly
      ? [{ label: "desktop", width: 1280, height: 900, mobile: false }]
      : [
          { label: "desktop", width: 1280, height: 900, mobile: false },
          { label: "mobile", width: 390, height: 844, mobile: true }
        ];

    for (const vp of viewports) {
      await cdp.send(
        "Emulation.setDeviceMetricsOverride",
        { width: vp.width, height: vp.height, deviceScaleFactor: vp.mobile ? 2 : 1, mobile: vp.mobile },
        sessionId
      );

      // 先首次加载 SPA 并等待首屏挂载完成，随后通过 hash 切换极速巡检
      await cdp.send(
        "Page.navigate",
        { url: `http://127.0.0.1:${port}${BASE_PREFIX}/#/` },
        sessionId
      );
      for (let attempt = 0; attempt < 40; attempt++) {
        const readyRes = await cdp.send(
          "Runtime.evaluate",
          { expression: `Boolean(document.querySelector("h1")?.textContent?.trim())`, returnByValue: true },
          sessionId
        );
        if (readyRes.result?.value) break;
        await new Promise((r) => setTimeout(r, 80));
      }

      for (const route of routes) {
        cdp.events.length = 0;
        await cdp.send(
          "Runtime.evaluate",
          { expression: `window.location.hash = ${JSON.stringify(route.hash)}; window.scrollTo(0, 0);` },
          sessionId
        );
        await new Promise((r) => setTimeout(r, 120));

        const runtimeErrors = cdp.events
          .filter((e) => e.sessionId === sessionId)
          .flatMap((e) => {
            if (e.method === "Runtime.exceptionThrown") {
              return [e.params?.exceptionDetails?.text || "Runtime exception"];
            }
            if (e.method === "Runtime.consoleAPICalled" && e.params?.type === "error") {
              return [(e.params.args || []).map((a) => a.value ?? a.description ?? "").join(" ")];
            }
            return [];
          });

        const evalRes = await cdp.send(
          "Runtime.evaluate",
          { expression: INSPECT_DOM_EXPR, returnByValue: true },
          sessionId
        );
        const info = evalRes.result?.value ?? { h1: "", overflowX: 0, overlaps: [] };

        if (!info.h1) failures.push(`[${vp.label}] ${route.hash} 未渲染出 <h1> 标题`);
        if (info.overflowX > 2) {
          failures.push(`[${vp.label}] ${route.hash} 出现横向溢出 (+${Math.round(info.overflowX)}px)`);
        }
        for (const ov of info.overlaps) {
          failures.push(`[${vp.label}] ${route.hash} SVG 文字重叠：${ov}`);
        }
        for (const err of runtimeErrors) {
          failures.push(`[${vp.label}] ${route.hash} 控制台报错：${err}`);
        }

        if (shotsDir) {
          const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
          const outFile = path.resolve(ROOT, shotsDir, `${route.name}-${vp.label}.png`);
          fs.writeFileSync(outFile, Buffer.from(shot.data, "base64"));
        }
      }
    }

    ws.close();
  } finally {
    server.close();
    proc.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Windows 偶发文件句柄延迟释放，忽略临时目录清理错误
    }
  }

  if (failures.length > 0) {
    console.error(`\n❌ 冒烟巡检发现 ${failures.length} 个问题：\n`);
    for (const f of failures) console.error(`  • ${f}`);
    process.exit(1);
  }

  console.log(
    `✅ 冒烟巡检全部通过：共巡检 ${routes.length} 个路由（桌面 1280×900${desktopOnly ? "" : " + 手机 390×844"}），零报错、零溢出、零 SVG 文字重叠！${
      shotsDir ? ` 截图已保存至 ${shotsDir}/` : ""
    }`
  );
}

main().catch((err) => {
  console.error("❌ 冒烟脚本执行失败：", err.message || err);
  process.exit(1);
});
