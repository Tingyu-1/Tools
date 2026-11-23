<script setup lang="ts">
  import { computed, nextTick, onMounted, ref } from 'vue';
  import { useMessage } from 'naive-ui';
  import { CameraOutline, FolderOpenOutline, PauseOutline, PlayOutline, RefreshOutline, SaveOutline } from '@vicons/ionicons5';
  import { listVideos, getNotes, saveNotes, type VideoFile } from '@/api/tools/video';

  const message = useMessage();
  const folder = ref('D:\\AI_Test\\web_tool\\output\\recordings');
  const files = ref<VideoFile[]>([]);
  const currentFile = ref<VideoFile>();
  const loading = ref(false);
  const videoRef = ref<HTMLVideoElement>();
  const videoUrl = ref('');
  const currentTime = ref(0);
  const duration = ref(0);
  const origin = ref('');
  const jumpValue = ref('');
  const jumpMode = ref<'world' | 'video'>('world');
  const jumpHint = ref('');
  const notes = ref('');
  const notesStatus = ref('');
  const logInput = ref('');
  const logHint = ref('');
  const logRows = ref<{ time: string; seconds: number; context: string }[]>([]);

  const formatTime = (seconds: number) => new Date(Math.max(0, Math.floor(seconds)) * 1000).toISOString().slice(11, 19);
  const currentMeta = computed(() => currentFile.value ? `${new Date(currentFile.value.modified).toLocaleString('zh-CN')} · ${(currentFile.value.size / 1048576).toFixed(1)} MB` : '选择目录后加载视频');
  const parseTime = (value: string) => {
    const parts = value.split(':').map((item) => Number(item || 0));
    if (parts.length !== 3 || parts.some((item) => !Number.isInteger(item) || item < 0) || parts[1] > 59 || parts[2] > 59) return Number.NaN;
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  };

  async function loadVideos() {
    loading.value = true;
    try {
      const result = await listVideos(folder.value.trim());
      files.value = result.files || [];
      if (files.value[0]) await selectFile(files.value[0]);
      message.success(`读取到 ${files.value.length} 个视频`);
    } catch (error) { message.error(error instanceof Error ? error.message : '读取视频目录失败'); }
    finally { loading.value = false; }
  }

  async function selectFile(file: VideoFile) {
    currentFile.value = file;
    videoUrl.value = file.url.replace('/api/video?', '/video-api/api/video?');
    await nextTick();
    videoRef.value?.load();
  }

  function seek(seconds: number) { if (videoRef.value) videoRef.value.currentTime = Math.max(0, Math.min(seconds, duration.value || seconds)); }
  function jumpToTime() {
    const target = parseTime(jumpValue.value);
    if (Number.isNaN(target)) return (jumpHint.value = '时间格式应为 时:分:秒');
    let targetSeconds = target;
    if (jumpMode.value === 'world') {
      const originSeconds = parseTime(origin.value);
      if (Number.isNaN(originSeconds)) return (jumpHint.value = '请先填写原点时间');
      targetSeconds = (target - originSeconds + 86400) % 86400;
    }
    seek(targetSeconds); jumpHint.value = `已跳转至 ${formatTime(targetSeconds)}`;
  }
  async function loadNote() { const result = await getNotes().catch(() => null); if (result?.ok) notes.value = result.content || ''; }
  async function saveNote() { const result = await saveNotes(notes.value); notesStatus.value = result.ok ? '已保存' : '保存失败'; }
  function parseLog() {
    const rows: { time: string; seconds: number; context: string }[] = [];
    const regex = /(\d{2}):(\d{2}):(\d{2})/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(logInput.value)) !== null) {
      const h = Number(match[1]); const m = Number(match[2]); const s = Number(match[3]);
      if (h > 23 || m > 59 || s > 59) continue;
      const start = Math.max(0, match.index - 40); const end = Math.min(logInput.value.length, match.index + match[0].length + 60);
      rows.push({ time: match[0], seconds: h * 3600 + m * 60 + s, context: logInput.value.slice(start, end).replace(/\s+/g, ' ').trim() });
    }
    const seen = new Set<number>(); logRows.value = rows.filter((row) => !seen.has(row.seconds) && seen.add(row.seconds));
    logHint.value = logRows.value.length ? `识别到 ${logRows.value.length} 个时间戳` : '未识别到时间戳';
  }

  onMounted(() => { loadNote(); loadVideos(); });
</script>
<template>
  <div class="p-4 video-page">
    <div class="mb-4 flex items-center justify-between">
      <div><div class="text-2xl font-semibold">视频读取</div><div class="mt-1 text-gray-400">读取本地视频，定位时间并记录分析笔记</div></div>
      <n-space><n-button secondary :loading="loading" @click="loadVideos"><template #icon><n-icon><RefreshOutline /></n-icon></template>读取目录</n-button><n-button type="primary" :disabled="!currentFile"><template #icon><n-icon><CameraOutline /></n-icon></template>截取当前帧</n-button></n-space>
    </div>
    <n-grid cols="1 s:1 m:3" responsive="screen" :x-gap="16" :y-gap="16">
      <n-gi span="2">
        <n-card title="视频预览" :bordered="false" size="small">
          <template #header-extra><n-tag :type="currentFile ? 'success' : 'default'">{{ currentFile?.name || '未加载' }}</n-tag></template>
          <div class="video-stage"><video ref="videoRef" class="video-player" :src="videoUrl" controls preload="metadata" @timeupdate="currentTime = videoRef?.currentTime || 0" @loadedmetadata="duration = videoRef?.duration || 0" /><div v-if="!currentFile" class="video-empty"><n-icon size="48"><PlayOutline /></n-icon><div class="mt-2">从右侧选择视频文件</div></div></div>
          <n-slider class="mt-4" :value="currentTime" :max="duration || 1" :step="0.1" @update:value="seek" />
          <div class="mt-2 flex justify-between text-xs text-gray-400"><span>{{ formatTime(currentTime) }}</span><span>{{ formatTime(duration) }}</span></div>
          <n-space class="mt-3" justify="center"><n-button secondary @click="seek(currentTime - 10)">后退 10s</n-button><n-button type="primary" @click="videoRef?.paused ? videoRef?.play() : videoRef?.pause()"><template #icon><n-icon><PauseOutline /></n-icon></template>播放/暂停</n-button><n-button secondary @click="seek(currentTime + 10)">前进 10s</n-button></n-space>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="视频文件" :bordered="false" size="small">
          <n-input v-model:value="folder" placeholder="视频目录，例如 D:\\A_Download" @keyup.enter="loadVideos"><template #prefix><n-icon><FolderOpenOutline /></n-icon></template></n-input>
          <n-button block class="mt-3" secondary :loading="loading" @click="loadVideos">读取目录</n-button>
          <n-list class="mt-3" hoverable clickable><n-list-item v-for="file in files" :key="file.url" :class="currentFile?.url === file.url ? 'active-file' : ''" @click="selectFile(file)"><n-thing :title="file.name" :description="`${(file.size / 1048576).toFixed(1)} MB`" /></n-list-item></n-list>
          <n-empty v-if="!files.length" class="mt-4" description="暂无视频文件" />
        </n-card>
      </n-gi>
    </n-grid>
    <n-grid class="mt-4" cols="1 s:1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
      <n-gi>
        <n-card title="时间定位" :bordered="false" size="small">
          <n-input v-model:value="origin" placeholder="原点时间，例如 12:30:00"><template #prefix>原点</template></n-input>
          <n-space class="mt-3" align="center"><n-input v-model:value="jumpValue" placeholder="输入 时:分:秒" /><n-select v-model:value="jumpMode" :options="[{ label: '世界时间', value: 'world' }, { label: '视频时间', value: 'video' }]" style="width: 130px" /><n-button type="primary" @click="jumpToTime">跳转</n-button></n-space>
          <div class="mt-2 text-xs text-gray-400">{{ jumpHint }}</div>
        </n-card>
        <n-card class="mt-4" title="日志解析" :bordered="false" size="small">
          <n-input v-model:value="logInput" type="textarea" :rows="5" placeholder="粘贴包含 HH:MM:SS 的日志内容" />
          <n-button class="mt-3" secondary @click="parseLog">解析日志</n-button>
          <div class="mt-2 text-xs text-gray-400">{{ logHint }}</div>
          <n-list v-if="logRows.length" class="mt-2" size="small">
            <n-list-item v-for="row in logRows" :key="`${row.seconds}-${row.context}`">
              <n-thing :title="row.time" :description="row.context">
                <template #header-extra><n-button size="small" text type="primary" @click="seek(row.seconds)">跳转</n-button></template>
              </n-thing>
            </n-list-item>
          </n-list>
        </n-card>
      </n-gi>
      <n-gi><n-card title="分析笔记" :bordered="false" size="small"><n-input v-model:value="notes" type="textarea" :rows="12" placeholder="记录观察、时间点与结论" /><div class="mt-3 flex items-center justify-between"><span class="text-xs text-gray-400">{{ notesStatus }}</span><n-button type="primary" @click="saveNote"><template #icon><n-icon><SaveOutline /></n-icon></template>保存笔记</n-button></div></n-card></n-gi>
    </n-grid>
  </div>
</template>
<style scoped>
  .video-stage { position: relative; min-height: 360px; border: 1px dashed var(--n-border-color); border-radius: 6px; overflow: hidden; background: #111; }
  .video-player { display: block; width: 100%; min-height: 360px; max-height: 540px; object-fit: contain; }
  .video-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9ca3af; }
  .active-file { background: rgba(24, 160, 88, 0.1); }
</style>





