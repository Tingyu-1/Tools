const $ = id => document.getElementById(id), video = $('video'), progress = $('progress');
function fmt(s) { return new Date(Math.max(0, Math.floor(s)) * 1000).toISOString().slice(11, 19); }
function tv(p) { const v = ['H', 'M', 'S'].map(x => Number($(p + x).value || 0)); return v.some(x => !Number.isInteger(x) || x < 0) || v[1] > 59 || v[2] > 59 ? NaN : v[0] * 3600 + v[1] * 60 + v[2]; }
function bind(g, d) { const a = [...document.querySelector('[data-time="' + g + '"]').querySelectorAll('input')]; a.forEach((i, n) => { i.oninput = () => i.value = i.value.replace(/\D/g, '').slice(0, 2); i.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); n < a.length - 1 ? a[n + 1].focus() : d && d(); } }; }); }
function load(f) { video.src = f.url; video.load(); video.onloadedmetadata = () => { document.querySelector('.video-wrap').style.aspectRatio = video.videoWidth + ' / ' + video.videoHeight; }; $('videoName').textContent = f.name; $('videoMeta').textContent = new Date(f.modified).toLocaleString('zh-CN') + ' · ' + (f.size / 1048576).toFixed(1) + ' MB'; $('videoBadge').textContent = '已加载'; $('videoEmpty').style.display = 'none'; }
async function list() { const r = await fetch('/api/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: $('folder').value.trim() }) }).then(x => x.json()).catch(() => ({ ok: false, error: '服务未启动' })); const l = $('fileList'); l.innerHTML = ''; if (!r.ok) { l.textContent = r.error; return; } (r.files || []).forEach(f => { const e = document.createElement('div'); e.className = 'file-item'; e.textContent = f.name; e.onclick = () => load(f); l.append(e); }); if (r.files?.[0]) load(r.files[0]); }
function jump() { let s = tv('jump'); if (Number.isNaN(s)) return $('jumpHint').textContent = '时间格式不正确'; if ($('jumpMode').value === 'world') { const o = tv('origin'); if (Number.isNaN(o)) return $('jumpHint').textContent = '请先填写原点时间'; s = (s - o + 86400) % 86400; } video.currentTime = Math.min(s, video.duration || s); video.play(); $('jumpHint').textContent = '已跳转至视频 ' + fmt(video.currentTime); }
$('pauseBtn').onclick = () => { if (video.paused) { video.play(); $('pauseBtn').textContent = '暂停'; } else { video.pause(); $('pauseBtn').textContent = '继续'; } };
document.querySelectorAll('[data-skip]').forEach(b => b.onclick = () => video.currentTime = Math.max(0, video.currentTime + Number(b.dataset.skip)));
$('backCustom').onclick = () => video.currentTime = Math.max(0, video.currentTime - Number($('customSkip').value || 0));
$('forwardCustom').onclick = () => video.currentTime = Math.min(video.duration || Infinity, video.currentTime + Number($('customSkip').value || 0));
video.ontimeupdate = () => { $('currentTime').textContent = fmt(video.currentTime); progress.value = video.duration ? video.currentTime / video.duration * 100 : 0; };
progress.oninput = () => { if (video.duration) video.currentTime = progress.value / 100 * video.duration; };
$('loadFolder').onclick = list;
$('jumpBtn').onclick = jump;
bind('origin'); bind('jump', jump);
async function notes() { const r = await fetch('/api/notes').then(x => x.json()).catch(() => null); if (r?.ok) $('notes').value = r.content; }
$('saveNotes').onclick = async () => { const r = await fetch('/api/notes/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: $('notes').value }) }).then(x => x.json()); $('saveStatus').textContent = r.ok ? '已保存' : '保存失败'; };
notes(); list();
function parseLog() {
  const text = $('logInput').value;
  if (!text.trim()) { $('logHint').textContent = '请先粘贴日志内容'; $('logTable').innerHTML = ''; return; }
  const origin = tv('origin'), hasOrigin = !Number.isNaN(origin);
  const re = /(\d{2}):(\d{2}):(\d{2})/g;
  let m, rows = [];
  while ((m = re.exec(text)) !== null) {
    const h = +m[1], mi = +m[2], s = +m[3];
    if (h > 23 || mi > 59 || s > 59) continue;
    const ts = h * 3600 + mi * 60 + s;
    const st = Math.max(0, m.index - 40), en = Math.min(text.length, m.index + m[0].length + 60);
    const ctx = text.slice(st, en).replace(/\s+/g, ' ').trim();
    rows.push({ ts, tsStr: m[0], ctx });
  }
  if (!rows.length) { $('logHint').textContent = '未识别到时间戳'; $('logTable').innerHTML = ''; return; }
  const seen = new Set(), uniq = rows.filter(r => { if (seen.has(r.ts)) return false; seen.add(r.ts); return true; });
  let html = '<table class="log-table"><thead><tr><th>时间</th><th>日志内容</th><th>跳转</th></tr></thead><tbody>';
  uniq.forEach(r => {
    if (hasOrigin) {
      const vidSec = (r.ts - origin + 86400) % 86400;
      html += '<tr><td class="ts">' + r.tsStr + '</td><td class="msg">' + r.ctx + '</td><td class="act"><button class="go" onclick="jumpToLog(' + vidSec + ')">跳转</button></td></tr>';
    } else {
      html += '<tr><td class="ts">' + r.tsStr + '</td><td class="msg">' + r.ctx + '</td><td class="act">-</td></tr>';
    }
  });
  html += '</tbody></table>';
  $('logTable').innerHTML = html;
  $('logHint').textContent = '识别到 ' + uniq.length + ' 个时间戳' + (hasOrigin ? '' : '，请先填写原点时间后可跳转');
}
function jumpToLog(sec) { video.currentTime = Math.max(0, Math.min(sec, video.duration || sec)); video.play(); }
$('parseLog').onclick = parseLog;
