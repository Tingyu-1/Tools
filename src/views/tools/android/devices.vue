<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
  import { useMessage } from 'naive-ui';
  import { CheckmarkCircleOutline, CopyOutline, FolderOpenOutline, PencilOutline, RefreshOutline, VideocamOutline } from '@vicons/ionicons5';
  import { PhoneOutlined, PoweroffOutlined } from '@vicons/antd';
  import { adbAction, getAdbDevices, getAdbInfo, mediaAction, type AdbDevice } from '@/api/tools/adb';
  const message = useMessage(); const devices = ref<AdbDevice[]>([]); const selectedSerial = ref(''); const loading = ref(false); const infoLoading = ref(false); const noteLoading = ref(false); const deviceOutput = ref(''); const actionLog = ref(''); const textInput = ref(''); const note = ref(''); const recording = ref(false); const adbSettings = ref({ outputFolder: 'D:/AI_Test/web_tool/output', recordingFolder: 'D:/AI_Test/web_tool/output/recordings', logFolder: 'D:/AI_Test/web_tool/output/logs', openLogFolder: true, confirmFastboot: true }); const recordingStartedAt = ref(0); const recordingSeconds = ref(0); const recordingFile = ref(''); const recordingUrl = ref(''); const screenshotFile = ref(''); const screenshotUrl = ref(''); let timer: ReturnType<typeof setInterval> | undefined;
  const selectedDevice = computed(() => devices.value.find((item) => item.serial === selectedSerial.value)); const infoRows = computed(() => deviceOutput.value.split(/\r?\n/).filter(Boolean).map((line) => { const [label, ...rest] = line.split('\t'); return { label: label || '信息', value: rest.join('\t') || line }; }));
  async function refreshDevices() { loading.value = true; try { const result = await getAdbDevices(); devices.value = result.devices || []; if (!selectedSerial.value || !devices.value.some((item) => item.serial === selectedSerial.value)) selectedSerial.value = devices.value[0]?.serial || ''; message.success(`已发现 ${devices.value.length} 台设备`); } catch (error) { message.error(error instanceof Error ? error.message : '设备刷新失败'); } finally { loading.value = false; } }
  async function readDeviceInfo(showMessage = true) { if (!selectedSerial.value) return; infoLoading.value = true; try { const result = await getAdbInfo(selectedSerial.value); deviceOutput.value = result.stdout || result.error || '未返回设备信息'; if (showMessage) message.success('设备信息已刷新'); } catch (error) { deviceOutput.value = error instanceof Error ? error.message : '设备信息读取失败'; message.error(deviceOutput.value); } finally { infoLoading.value = false; } }
  function formatSeconds(value: number) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; }
  async function copyValue(value: string) {
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const input = document.createElement('textarea');
        input.value = value;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('浏览器拒绝了复制请求');
      }
      message.success('已复制');
    } catch (error) {
      message.error(error instanceof Error ? `复制失败：${error.message}` : '复制失败，请检查浏览器剪贴板权限');
    }
  }
  async function mediaOp(file: string, action: 'copy-file' | 'copy-path' | 'open-folder') { if (!file) return message.warning('文件尚未生成'); const result = await mediaAction(file, action); if (result.ok) message.success(action === 'open-folder' ? '已打开文件夹' : action === 'copy-file' ? '已复制文件' : '已复制路径'); else message.error(result.error || '操作失败'); }
  async function confirmFastboot() { if (!selectedSerial.value) return message.warning('请先选择设备'); const confirmed = await new Promise<boolean>((resolve) => { window.$dialog?.warning({ title: '确认进入 Fastboot', content: `设备 ${selectedSerial.value} 将离开 Android 系统并进入 Fastboot，是否继续？`, positiveText: '继续', negativeText: '取消', onPositiveClick: () => resolve(true), onNegativeClick: () => resolve(false), onClose: () => resolve(false) }); }); if (confirmed) runAction('/fastboot', {}, '已发送 Fastboot 重启命令'); }
  async function runAction(path: string, body: Record<string, unknown>, successText: string) { if (!selectedSerial.value) return message.warning('请先选择设备'); try { const result = await adbAction(path, { serial: selectedSerial.value, ...body }); actionLog.value = result.stdout || result.stderr || result.error || result.message || successText; message[result.ok ? 'success' : 'error'](result.ok ? successText : (result.error || '操作失败')); } catch (error) { actionLog.value = error instanceof Error ? error.message : '操作失败'; message.error(actionLog.value); } }
  async function runCommand() { if (!textInput.value.trim()) return message.warning('请输入命令'); await runAction('/command', { command: textInput.value }, '命令执行完成'); }
  async function trigger284() { if (!selectedSerial.value) return message.warning('请先选择设备'); await runAction('/miui284', { action: 'trigger' }, '284 日志生成已触发，请等待完成后保存'); }
  async function save284() { if (!selectedSerial.value) return message.warning('请先选择设备'); try { const result = await adbAction('/miui284', { serial: selectedSerial.value, folder: adbSettings.value.logFolder }); actionLog.value = result.message || result.error || '284 日志已保存'; if (result.ok) { message.success(actionLog.value); if (result.file && adbSettings.value.openLogFolder) await mediaOp(result.file, 'open-folder'); } else message.error(result.error || '日志保存失败'); } catch (error) { message.error(error instanceof Error ? error.message : '日志保存失败'); } }
  async function pullLatestVideo() { if (!selectedSerial.value) return message.warning('请先选择设备'); const result = await adbAction('/record/pull-latest', { serial: selectedSerial.value }); if (result.ok) { recordingFile.value = result.file || ''; recordingUrl.value = result.url ? `/adb-api${result.url}` : ''; message.success(result.message || '最近视频已保存'); } else message.error(result.error || '保存视频失败'); }
  async function takeScreenshot() { if (!selectedSerial.value) return message.warning('请先选择设备'); screenshotFile.value = ''; screenshotUrl.value = ''; const result = await adbAction('/screenshot', { serial: selectedSerial.value }); if (result.ok && result.file && result.url) { screenshotFile.value = result.file; screenshotUrl.value = `/adb-api${result.url}`; actionLog.value = '截图已保存'; message.success('截图已保存'); } else { actionLog.value = result.error || '截图文件未生成'; message.error(actionLog.value); } }
  async function toggleRecording() { if (!selectedSerial.value) return message.warning('请先选择设备'); if (!recording.value) { recordingFile.value = ''; recordingUrl.value = ''; const result = await adbAction('/record/start', { serial: selectedSerial.value, folder: adbSettings.value.recordingFolder }); if (!result.ok) return message.error(result.error || '录屏启动失败'); recording.value = true; recordingStartedAt.value = Date.now(); recordingSeconds.value = 0; timer = setInterval(() => { recordingSeconds.value = Math.floor((Date.now() - recordingStartedAt.value) / 1000); }, 1000); message.success('已开始录屏'); } else { if (timer) clearInterval(timer); message.info('正在停止并拉取录屏文件，请稍候'); const result = await adbAction('/record/stop', { serial: selectedSerial.value, folder: adbSettings.value.recordingFolder }); recording.value = false; recordingFile.value = result.file || ''; recordingUrl.value = result.ok && result.file && result.url ? `/adb-api${result.url}` : ''; actionLog.value = result.ok ? '录屏已停止并保存' : result.error || '录屏停止失败'; message[result.ok ? 'success' : 'error'](actionLog.value); } }
  async function saveNote() { const result = await adbAction('/notes/save', { content: note.value }); if (result.ok) { localStorage.setItem('tools-adb-note-cache', note.value); await loadNote(false); message.success('笔记已保存'); } else message.error(result.error || '保存失败'); }
  async function loadNote(silent = false) {
    noteLoading.value = true;
    try {
      const response = await fetch('/adb-api/api/notes', { cache: 'no-store' });
      const raw = await response.text();
      let result;
      try { result = JSON.parse(raw); } catch { throw new Error('笔记服务返回内容异常'); }
      if (!response.ok || !result.ok) throw new Error(result.error || '读取笔记失败');
      note.value = result.content || '';
      localStorage.setItem('tools-adb-note-cache', note.value);
    } catch (error) {
      if (!note.value) note.value = localStorage.getItem('tools-adb-note-cache') || '';
      if (!silent) message.error(error instanceof Error ? error.message : '读取笔记失败');
    } finally {
      noteLoading.value = false;
    }
  }
  function loadAdbSettings() { try { const value = JSON.parse(localStorage.getItem('tools-adb-settings') || '{}'); adbSettings.value = { ...adbSettings.value, ...value }; } catch {} }
  watch(selectedSerial, (serial, previous) => { if (serial && serial !== previous) readDeviceInfo(false); }); onMounted(async () => { loadAdbSettings(); note.value = localStorage.getItem('tools-adb-note-cache') || ''; await Promise.all([refreshDevices(), loadNote()]); }); onUnmounted(() => { if (timer) clearInterval(timer); });
</script>
<template>
  <div class="adb-page p-4"><div class="mb-4 flex items-center justify-between"><div><div class="text-2xl font-semibold">ADB 设备</div><div class="mt-1 text-gray-400">设备控制、信息采集与媒体结果</div></div><n-button secondary :loading="loading" @click="refreshDevices"><template #icon><n-icon><RefreshOutline /></n-icon></template>刷新设备</n-button></div>
    <n-grid cols="1 s:1 m:4" responsive="screen" :x-gap="16" :y-gap="16"><n-gi><n-card title="设备列表" :bordered="false" size="small"><template #header-extra><n-tag :type="devices.length ? 'success' : 'default'">{{ devices.length }} 台设备</n-tag></template><n-empty v-if="!devices.length" description="暂未发现设备" /><n-list v-else hoverable clickable><n-list-item v-for="device in devices" :key="device.serial" @click="selectedSerial = device.serial"><n-thing><template #avatar><n-avatar round :color="selectedSerial === device.serial ? '#18a058' : '#2080f0'"><n-icon><PhoneOutlined /></n-icon></n-avatar></template><template #header>{{ device.model || '未知型号' }}</template><template #description><div class="serial-text">{{ device.serial }}</div><n-tag v-if="device.product" class="mt-2" size="small" round>{{ device.product }}</n-tag></template></n-thing></n-list-item></n-list></n-card></n-gi>
      <n-gi span="3"><n-card title="设备控制" :bordered="false" size="small"><template #header-extra><n-tag :type="selectedDevice ? 'success' : 'default'">{{ selectedDevice ? `已选择 ${selectedSerial}` : '未选择设备' }}</n-tag></template><n-grid cols="1 s:2 m:4" responsive="screen" :x-gap="10" :y-gap="10"><n-gi><n-button block secondary :loading="infoLoading" :disabled="!selectedSerial" @click="readDeviceInfo()"><template #icon><n-icon><CheckmarkCircleOutline /></n-icon></template>读取设备信息</n-button></n-gi><n-gi><n-button block secondary @click="takeScreenshot"><template #icon><n-icon><VideocamOutline /></n-icon></template>截取屏幕</n-button></n-gi><n-gi><n-button block secondary :type="recording ? 'error' : 'default'" @click="toggleRecording"><template #icon><n-icon><VideocamOutline /></n-icon></template>{{ recording ? `停止录屏 ${formatSeconds(recordingSeconds)}` : '开始录屏' }}</n-button></n-gi><n-gi><n-button block type="warning" secondary @click="confirmFastboot"><template #icon><n-icon><PoweroffOutlined /></n-icon></template>进入 Fastboot</n-button></n-gi><n-gi><n-button block secondary @click="pullLatestVideo">保存最近视频</n-button></n-gi><n-gi><n-button block secondary @click="trigger284">拉取日志</n-button></n-gi><n-gi><n-button block type="primary" secondary @click="save284">保存日志</n-button></n-gi></n-grid><n-divider /><div class="mb-2 font-medium">命令执行</div><n-input-group><n-input v-model:value="textInput" placeholder="输入要发送到设备的文本" /><n-button type="primary" @click="runCommand">执行</n-button></n-input-group></n-card>
        <n-card class="mt-4" title="设备信息" :bordered="false" size="small"><template #header-extra><n-tag>{{ infoLoading ? '读取中' : '实时结果' }}</n-tag></template><n-spin :show="infoLoading"><n-empty v-if="!infoRows.length" description="选择设备后自动读取信息" /><div v-else class="info-list"><div v-for="row in infoRows" :key="row.label" class="info-row"><span class="info-label">{{ row.label }}</span><span class="info-value">{{ row.value }}</span><n-button quaternary circle size="small" @click="copyValue(row.value)"><template #icon><n-icon><CopyOutline /></n-icon></template></n-button></div></div></n-spin></n-card>
        <n-card v-if="recording || recordingUrl" class="mt-4" title="最近录屏" :bordered="false" size="small"><template #header-extra><n-tag :type="recording ? 'warning' : 'success'">{{ recording ? `录制中 ${formatSeconds(recordingSeconds)}` : '已保存到本地' }}</n-tag></template><div v-if="recording" class="recording-state">正在录制，请点击上方“停止录屏”结束。</div><template v-else><video class="media-preview" controls :src="recordingUrl" /><div class="media-path">{{ recordingFile }}</div><div class="media-actions"><n-button size="small" @click="mediaOp(recordingFile, 'open-folder')"><template #icon><n-icon><FolderOpenOutline /></n-icon></template>打开文件夹</n-button><n-button size="small" @click="mediaOp(recordingFile, 'copy-path')">复制视频路径</n-button><n-button size="small" @click="mediaOp(recordingFile, 'copy-file')">复制视频</n-button></div></template></n-card>
        <n-card v-if="screenshotUrl" class="mt-4" title="最近截图" :bordered="false" size="small"><img class="screenshot-preview" :src="screenshotUrl" alt="设备截图" /><div class="media-actions"><n-button size="small" @click="mediaOp(screenshotFile, 'open-folder')"><template #icon><n-icon><FolderOpenOutline /></n-icon></template>打开文件夹</n-button><n-button size="small" @click="mediaOp(screenshotFile, 'copy-path')">复制图片路径</n-button><n-button size="small" @click="mediaOp(screenshotFile, 'copy-file')">复制图片</n-button></div></n-card>
        <n-card class="mt-4" title="操作日志" :bordered="false" size="small"><pre class="log-box">{{ actionLog || '暂无操作日志' }}</pre></n-card>
        <n-card class="mt-4" title="设备笔记" :bordered="false" size="small"><template #header-extra><n-button text size="small" :loading="noteLoading" @click="loadNote()">重新加载文档</n-button></template><n-input v-model:value="note" type="textarea" :rows="12" :disabled="noteLoading" placeholder="正在读取 documents/备忘模板.md…" /><n-space class="mt-3"><n-button type="primary" :loading="noteLoading" @click="saveNote"><template #icon><n-icon><PencilOutline /></n-icon></template>保存笔记</n-button><n-button secondary :loading="noteLoading" @click="loadNote()">从文档重新加载</n-button></n-space></n-card>
      </n-gi>
    </n-grid>
  </div>
</template>
<style scoped>
  .adb-page { max-height: calc(100vh - 120px); overflow-y: auto; }
  .serial-text { white-space: nowrap; font-family: monospace; font-size: 12px; }
  .info-list { overflow: hidden; border: 1px solid var(--n-border-color); border-radius: 4px; }
  .info-row { display: grid; grid-template-columns: 110px minmax(0, 1fr) 32px; align-items: center; min-height: 38px; padding: 4px 8px 4px 12px; border-bottom: 1px solid var(--n-divider-color); }
  .info-row:last-child { border-bottom: 0; }
  .info-label { color: var(--n-text-color-3); font-size: 13px; }
  .info-value { overflow-wrap: anywhere; font-family: monospace; font-size: 13px; }
  .media-preview { width: min(100%, 640px); max-height: 420px; display: block; margin: 0 auto; background: #111; }
  .screenshot-preview { display: block; max-width: 100%; max-height: 480px; margin: 0 auto; object-fit: contain; background: #111; }
  .media-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .media-path { margin-top: 8px; overflow-wrap: anywhere; color: var(--n-text-color-3); font-family: monospace; font-size: 12px; }
  .recording-state { padding: 24px; text-align: center; color: var(--n-text-color-3); }
  .log-box { min-height: 56px; margin: 0; white-space: pre-wrap; color: var(--n-text-color-3); font-size: 12px; }
</style>










