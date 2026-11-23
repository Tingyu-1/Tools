<script setup lang="ts">
  import { onMounted, reactive } from 'vue';
  import { useMessage } from 'naive-ui';
  import { getAdbSettings, saveAdbSettings, type AdbSettings } from '@/api/tools/adb';

  const message = useMessage();
  const defaults: AdbSettings = {
    adbPath: 'adb',
    outputFolder: 'D:/AI_Test/Tools/output',
    recordingFolder: '',
    logFolder: '',
    screenshotFolder: '',
    noteFile: 'D:/AI_Test/Tools/documents/备忘模板.md',
    recordingLimit: 180,
    openLogFolder: true,
    confirmFastboot: true,
  };
  const settings = reactive<AdbSettings>({ ...defaults });

  async function load() {
    try {
      const result = await getAdbSettings();
      Object.assign(settings, result.settings);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '读取 ADB 设置失败');
    }
  }

  async function save() {
    try {
      const result = await saveAdbSettings({ ...settings });
      Object.assign(settings, result.settings);
      localStorage.setItem('tools-adb-settings', JSON.stringify(result.settings));
      message.success('ADB 路径设置已保存');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存 ADB 设置失败');
    }
  }

  onMounted(load);
</script>

<template>
  <n-grid cols="2 s:2 m:2 l:3 xl:3 2xl:3" responsive="screen">
    <n-grid-item>
      <n-form :label-width="100">
        <n-form-item label="ADB 路径"><n-input v-model:value="settings.adbPath" placeholder="adb 或 adb.exe 完整路径" /></n-form-item>
        <n-form-item label="默认输出目录"><n-input v-model:value="settings.outputFolder" /></n-form-item>
        <n-form-item label="录屏保存目录"><n-input v-model:value="settings.recordingFolder" placeholder="留空则使用默认输出目录" /></n-form-item>
        <n-form-item label="日志保存目录"><n-input v-model:value="settings.logFolder" placeholder="留空则使用默认输出目录" /></n-form-item>
        <n-form-item label="截图保存目录"><n-input v-model:value="settings.screenshotFolder" placeholder="留空则使用默认输出目录" /></n-form-item>
        <n-form-item label="设备笔记文件"><n-input v-model:value="settings.noteFile" placeholder="D:/AI_Test/Tools/documents/备忘模板.md" /></n-form-item>
        <n-button type="primary" @click="save">保存路径设置</n-button>
      </n-form>
    </n-grid-item>
  </n-grid>
</template>
