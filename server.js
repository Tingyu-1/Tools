import { createServer } from 'node:http';
import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, dirname, extname, resolve, basename, isAbsolute, sep } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const exec = promisify(execFile), root = dirname(fileURLToPath(import.meta.url)), port = Number(process.env.PORT || 5174), host = '127.0.0.1', adb = process.env.ADB_PATH || 'adb';
const settingsFile = join(root, 'adb-settings.json');
const defaults = { adbPath: adb, outputFolder: join(root, 'output'), recordingFolder: '', logFolder: '', screenshotFolder: '', noteFile: join(root, 'documents', '备忘模板.md'), recordingLimit: 180, openLogFolder: true, confirmFastboot: true };
let settings = { ...defaults };
try { settings = { ...defaults, ...JSON.parse(await readFile(settingsFile, 'utf8')) }; } catch (error) { if (error.code !== 'ENOENT') console.error('Unable to load ADB settings:', error.message); }
const recordingProcesses = new Map();
const json = (r, s, v) => { r.writeHead(s, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); r.end(JSON.stringify(v)); };
async function body(q) { let s = ''; for await (const c of q) s += c; return s ? JSON.parse(s) : {}; }
async function run(a, t = 30000) { try { const r = await exec(adb, a, { encoding: 'utf8', timeout: t, maxBuffer: 20e6, windowsHide: true }); return { ok: true, stdout: r.stdout, stderr: r.stderr }; } catch (e) { return { ok: false, stdout: e.stdout || '', stderr: e.stderr || e.message }; } }
function args(s, a) { if (!/[\w.:-]+$/.test(s || '')) throw Error('无效设备'); return ['-s', s, ...a]; }
async function devices() { const r = await run(['devices', '-l']); return { ...r, devices: (r.stdout || '').split(/\r?\n/).slice(1).filter(Boolean).map(x => { const p = x.trim().split(/\s+/); const m = Object.fromEntries(p.slice(2).map(v => { const i = v.indexOf(':'); return i > 0 ? [v.slice(0, i), v.slice(i + 1)] : [v, '']; })); return { serial: p[0], state: p[1] || 'unknown', model: m.model || '未知型号', product: m.product || '' }; }) }; }
async function send(req, res) {
const b = await body(req), s = b.serial;
  if (req.url === '/api/adb-settings') {
    const next = { ...settings };
    for (const key of ['adbPath', 'outputFolder', 'recordingFolder', 'logFolder', 'screenshotFolder', 'noteFile']) {
      if (typeof b[key] !== 'string' || b[key].includes('\0')) throw Error('Invalid path');
      next[key] = b[key].trim();
    }
    if (!next.adbPath || !isAbsolute(next.outputFolder)) throw Error('ADB path and absolute output folder are required');
    for (const key of ['recordingFolder', 'logFolder', 'screenshotFolder']) if (next[key] && !isAbsolute(next[key])) throw Error('Output folders must be absolute paths');
    if (!isAbsolute(next.noteFile)) throw Error('Note file must be an absolute path');
    if (!Number.isInteger(b.recordingLimit) || b.recordingLimit < 1 || b.recordingLimit > 600) throw Error('Recording limit must be between 1 and 600 seconds');
    next.recordingLimit = b.recordingLimit;
    next.openLogFolder = b.openLogFolder === true;
    next.confirmFastboot = b.confirmFastboot !== false;
    await writeFile(settingsFile, JSON.stringify(next, null, 2), 'utf8');
    settings = next;
    return json(res, 200, { ok: true, settings });
  }
  if (req.url === '/api/video-action') {
    const file = resolve(String(b.file || ''));
    const outputRoot = resolve(root, 'output');
    if (!file.startsWith(outputRoot) || !file.toLowerCase().endsWith('.mp4')) return json(res, 400, { ok: false, error: '视频路径无效' });
    const action = b.action;
    if (action === 'open-folder') { execFile('explorer.exe', ['/select,', file], { windowsHide: true }); return json(res, 200, { ok: true }); }
    if (action === 'copy-path') { await exec(adb === 'adb' ? 'powershell.exe' : 'powershell.exe', ['-NoProfile', '-Command', `Set-Clipboard -Value '${file.replaceAll("'", "''")}'`], { windowsHide: true }); return json(res, 200, { ok: true, message: '视频路径已复制' }); }
    if (action === 'copy-file') { await execFile('powershell.exe', ['-NoProfile', '-Command', `Set-Clipboard -Path '${file.replaceAll("'", "''")}'`], { windowsHide: true }); return json(res, 200, { ok: true, message: '视频文件已复制' }); }
    return json(res, 400, { ok: false, error: '未知操作' });
  }
  if (req.url === '/api/media-action') {
    const file = resolve(String(b.file || ''));
    const outputRoot = resolve(root, 'output');
    const ext = extname(file).toLowerCase();
    if (!file.startsWith(outputRoot) || !['.mp4', '.webm', '.mov', '.mkv', '.avi', '.png', '.jpg', '.jpeg'].includes(ext)) return json(res, 400, { ok: false, error: '媒体路径无效' });
    try {
      if (!(await stat(file)).isFile()) return json(res, 404, { ok: false, error: `文件不存在：${file}` });
      if (b.action === 'open-folder') await execFile('powershell.exe', ['-NoProfile', '-Command', `Start-Process explorer.exe -ArgumentList '/select,${file.replaceAll("'", "''")}'`], { windowsHide: true });
      else if (b.action === 'copy-path') await execFile('powershell.exe', ['-NoProfile', '-Command', `Set-Clipboard -Value '${file.replaceAll("'", "''")}'`], { windowsHide: true });
      else if (b.action === 'copy-file') {
        const escaped = file.replaceAll("'", "''");
        const command = `Add-Type -AssemblyName System.Windows.Forms; $files = New-Object System.Collections.Specialized.StringCollection; [void]$files.Add('${escaped}'); [System.Windows.Forms.Clipboard]::SetFileDropList($files)`;
        await execFile('powershell.exe', ['-NoProfile', '-STA', '-Command', command], { windowsHide: true });
      }
      else return json(res, 400, { ok: false, error: '未知操作' });
      return json(res, 200, { ok: true });
    } catch (e) { return json(res, 200, { ok: false, error: e.message }); }
  }
  if (req.url === '/api/info') { const r = await run(args(s, ['shell', 'getprop'])); const p = k => r.stdout.match(new RegExp('\\[' + k.replaceAll('.', '\\.') + '\\]: \\[(.*?)\\]'))?.[1] || ''; const h = await run(args(s, ['shell', 'dumpsys', 'package', 'com.miui.home'])); return json(res, 200, { ok: r.ok && h.ok, stdout: '设备ID\t' + (p('ro.serialno') || s) + '\n型号\t' + p('ro.product.model') + '\nAndroid\t' + p('ro.build.version.release') + '\n版本\t' + p('ro.build.version.incremental') + '\n桌面版本\t' + (h.stdout.match(/versionName=([^\s]+)/)?.[1] || '未读取到') }); }
  if (req.url === '/api/command') return json(res, 200, await run(args(s, String(b.command || '').replace(/^adb\s+/i, '').split(/\s+/))));
  if (req.url === '/api/text') return json(res, 200, await run(args(s, ['shell', 'input', 'text', String(b.text || '').replace(/ /g, '%s')])));
  if (req.url === '/api/fastboot') return json(res, 200, await run(args(s, ['reboot', 'bootloader'])));
  if (req.url === '/api/screenshot') { try { const f = join(root, 'output', 'screenshots'); await mkdir(f, { recursive: true }); const stamp = new Date().toISOString().replace(/[-:.TZ]/g, ''); const n = `${s}-${stamp}.png`; const file = join(f, n); const r = await exec(adb, args(s, ['exec-out', 'screencap', '-p']), { encoding: 'buffer', maxBuffer: 20e6, windowsHide: true }); if (!r.stdout || !r.stdout.length) return json(res, 200, { ok: false, error: '截图命令没有返回图片数据' }); await writeFile(file, r.stdout); return json(res, 200, { ok: true, file, url: '/output/screenshots/' + n + '?v=' + Date.now() }); } catch (e) { return json(res, 200, { ok: false, error: e.stderr?.toString() || e.message }); } }
  if (req.url === '/api/record/start') { const folder = String(b.folder || join(root, 'output', 'recordings')); await mkdir(folder, { recursive: true }); const state = await run(args(s, ['get-state']), 10000); if (!state.ok || !/device/.test(state.stdout)) return json(res, 200, { ok: false, error: state.stderr || '设备未授权或未连接' }); await run(args(s, ['shell', 'input', 'keyevent', '224']), 5000); await run(args(s, ['shell', 'wm', 'dismiss-keyguard']), 5000); await new Promise(resolve => setTimeout(resolve, 500)); const remote = '/sdcard/adb-console-screen.mp4'; const child = execFile(adb, args(s, ['shell', 'screenrecord', '--time-limit', '300', remote]), { windowsHide: true, maxBuffer: 1024 * 1024 }); let processError = ''; child.stderr?.on('data', chunk => { processError += chunk.toString(); }); child.on('error', error => { processError = error.message; }); recordingProcesses.set(s, child); await new Promise(resolve => setTimeout(resolve, 600)); if (child.exitCode !== null) { recordingProcesses.delete(s); return json(res, 200, { ok: false, error: processError || `设备录屏进程已退出（${child.exitCode}）` }); } const file = join(folder, `${s}-${Date.now()}-screen.mp4`); return json(res, 200, { ok: true, startedAt: Date.now(), file, message: '已开始录屏，每段最长 5 分钟。' }); }
  if (req.url === '/api/record/stop') { const folder = String(b.folder || join(root, 'output', 'recordings')); await mkdir(folder, { recursive: true }); const file = join(folder, `${s}-${Date.now()}-screen.mp4`); recordingProcesses.delete(s); await run(args(s, ['shell', 'pkill', '-INT', 'screenrecord']), 10000); let stopped = false; for (let i = 0; i < 12; i++) { await new Promise(r => setTimeout(r, 1000)); const state = await run(args(s, ['shell', 'pidof', 'screenrecord']), 5000); if (!state.stdout.trim()) { stopped = true; break; } } if (!stopped) await run(args(s, ['shell', 'killall', '-2', 'screenrecord']), 10000); await new Promise(r => setTimeout(r, 2500)); const r = await run(args(s, ['pull', '/sdcard/adb-console-screen.mp4', file]), 120000); let valid = r.ok; if (valid) { try { const data = await readFile(file); valid = data.includes(Buffer.from('moov')); } catch { valid = false; } } return json(res, 200, { ...r, ok: valid, file: valid ? file : '', url: valid ? '/output/recordings/' + file.split(/[\\/]/).pop() + '?v=' + Date.now() : '', error: valid ? '' : (r.stderr || '录屏文件未正常封装，未保存') }); }
  if (req.url === '/api/record/pull-latest') {
    const folder = String(b.folder || join(root, 'output', 'recordings'));
    await mkdir(folder, { recursive: true });
    const scan = await run(args(s, ['shell', 'ls', '-1t', '/sdcard/DCIM/ScreenRecorder/*.mp4', '/sdcard/DCIM/ScreenRecorder/*.mov', '/sdcard/DCIM/ScreenRecorder/*.mkv']), 15000);
    const line = (scan.stdout || '').trim().split(/\r?\n/).filter(Boolean)[0] || '';
    const remote = line;
    if (!remote) return json(res, 200, { ok: false, error: '设备 DCIM/ScreenRecorder 目录中没有找到视频' });
    const base = basename(remote);
    const file = join(folder, `${s}-${base}`);
    try { if ((await stat(file)).isFile()) return json(res, 200, { ok: true, file, url: '/output/recordings/' + basename(file) + '?v=' + Date.now(), message: '本地已存在该视频' }); } catch {}
    const pulled = await run(args(s, ['pull', remote, file]), 180000);
    return json(res, 200, { ...pulled, file: pulled.ok ? file : '', url: pulled.ok ? '/output/recordings/' + basename(file) + '?v=' + Date.now() : '', error: pulled.ok ? '' : (pulled.stderr || '视频保存失败') });
  }
  if (req.url === '/api/notes/save') { await mkdir(dirname(settings.noteFile), { recursive: true }); await writeFile(settings.noteFile, String(b.content || ''), 'utf8'); return json(res, 200, { ok: true, file: settings.noteFile }); }
  if (req.url === '/api/miui284') {
    const folder = String(b.folder || join(root, 'output', 'logs'));
    await mkdir(folder, { recursive: true });
    if (b.action === 'trigger') {
      const broadcast = await run(args(s, ['shell', 'am', 'broadcast', '-a', 'android.provider.Telephony.SECRET_CODE', '-d', 'android_secret_code://284']), 15000);
      return json(res, 200, { ...broadcast, message: broadcast.ok ? '284 日志生成已触发，请等待设备完成后再点击“保存日志”' : '284 广播发送失败' });
    }
    const scan = await run(args(s, ['shell', 'ls', '-1t', '/sdcard/MIUI/debug_log/*.zip', '/sdcard/MIUI/debug_log/*.tgz']), 15000);
    const remote = (scan.stdout || '').trim().split(/\r?\n/).filter(Boolean)[0] || '';
    if (!remote) return json(res, 200, { ok: false, error: '设备日志目录中没有找到 ZIP/TGZ 文件。请先点击“拉取日志”触发生成，等待完成后再保存。' });
    const file = join(folder, `${s}-284-${basename(remote)}`);
    try { if ((await stat(file)).isFile()) return json(res, 200, { ok: true, file, message: '电脑中已存在该日志文件，无需重复拉取' }); } catch {}
    const pulled = await run(args(s, ['pull', remote, file]), 180000);
    return json(res, 200, { ...pulled, file: pulled.ok ? file : '', message: pulled.ok ? '284 日志已拉取' : '日志文件拉取失败' });
  }
  if (req.url === '/api/videos') {
    const dir = String(b.folder || '');
    const es = await readdir(dir, { withFileTypes: true });
    const allowed = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi']);
    const files = [];
    for (const e of es) {
      if (!e.isFile() || !allowed.has(extname(e.name).toLowerCase())) continue;
      const fp = join(dir, e.name), i = await stat(fp);
      files.push({ name: e.name, modified: i.mtimeMs, size: i.size, url: '/api/video?folder=' + encodeURIComponent(dir) + '&name=' + encodeURIComponent(e.name) });
    }
    return json(res, 200, { ok: true, files: files.sort((a, b) => b.modified - a.modified) });
  }
  return json(res, 404, { ok: false, error: '未找到接口' });
}
async function video(req, res) {
  const u = new URL(req.url, 'http://x'), f = join(u.searchParams.get('folder') || '', u.searchParams.get('name') || '');
  let i;
  try { i = await stat(f); } catch { return json(res, 404, { ok: false, error: '视频文件不存在或尚未保存完成' }); }
  if (!i.isFile() || !resolve(f).startsWith(resolve(root, 'output') + sep)) return json(res, 404, { ok: false, error: '视频路径无效' });
  const type = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo' }[extname(f).toLowerCase()] || 'application/octet-stream';
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  let s = m ? Number(m[1] || 0) : 0, e = m ? Number(m[2] || i.size - 1) : i.size - 1;
  s = Math.max(0, Math.min(s, i.size - 1)); e = Math.max(s, Math.min(e, i.size - 1));
  res.writeHead(m ? 206 : 200, { 'Content-Type': type, 'Content-Length': e - s + 1, 'Content-Range': m ? 'bytes ' + s + '-' + e + '/' + i.size : undefined, 'Accept-Ranges': 'bytes' });
  const stream = createReadStream(f, { start: s, end: e });
  stream.on('error', error => {
    if (!res.headersSent) json(res, 404, { ok: false, error: `无法读取视频：${error.message}` });
    else res.destroy(error);
  });
  stream.pipe(res);
}
async function asset(res, file, type) { const data = await readFile(join(root, file)); res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(data); }
const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/video') return asset(res, 'public/video/index.html', 'text/html; charset=utf-8');
    if (req.method === 'GET' && req.url === '/adb') return asset(res, 'public/adb/index.html', 'text/html; charset=utf-8');
    if (req.method === 'GET' && req.url === '/adb/style.css') return asset(res, 'public/adb/style.css', 'text/css; charset=utf-8');
    if (req.method === 'GET' && req.url === '/adb/app.js') return asset(res, 'public/adb/app.js', 'application/javascript; charset=utf-8');
    if (req.method === 'GET' && req.url === '/video/style.css') return asset(res, 'public/video/style.css', 'text/css; charset=utf-8');
    if (req.method === 'GET' && req.url === '/video/app.js') return asset(res, 'public/video/app.js', 'application/javascript; charset=utf-8');
    if (req.method === 'GET' && req.url === '/api/devices') return json(res, 200, await devices());
    if (req.method === 'GET' && req.url === '/api/adb-settings') return json(res, 200, { ok: true, settings });
    if (req.method === 'GET' && req.url === '/api/notes') return json(res, 200, { ok: true, file: settings.noteFile, content: await readFile(settings.noteFile, 'utf8') });
    if (req.method === 'GET' && req.url.startsWith('/api/video?')) return video(req, res);
    if (req.method === 'GET' && req.url.startsWith('/output/')) {
      const relative = decodeURIComponent(req.url.slice(8).split('?')[0]);
      const f = resolve(root, 'output', relative);
      if (!f.startsWith(resolve(root, 'output') + sep)) return json(res, 403, { ok: false, error: '文件路径无效' });
      let info;
      try { info = await stat(f); } catch { return json(res, 404, { ok: false, error: '媒体文件不存在或尚未保存完成' }); }
      if (!info.isFile()) return json(res, 404, { ok: false, error: '媒体文件不存在' });
      const stream = createReadStream(f);
      stream.on('error', error => {
        if (!res.headersSent) json(res, 404, { ok: false, error: `无法读取媒体文件：${error.message}` });
        else res.destroy(error);
      });
      return stream.pipe(res);
    }
    if (req.method === 'POST') return send(req, res);
    return json(res, 404, { ok: false, error: '未找到接口' });
  } catch (e) { json(res, 400, { ok: false, error: e.message }); }
});
server.listen(port, host, () => console.log('ADB/Video service: http://' + host + ':' + port));

