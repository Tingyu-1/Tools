<script setup lang="ts">
  import { onMounted, reactive } from 'vue';
  import { useMessage } from 'naive-ui';
  const message = useMessage();
  const settings = reactive({ recordingLimit: 180, openLogFolder: true, confirmFastboot: true });
  function load() { try { Object.assign(settings, JSON.parse(localStorage.getItem('tools-adb-settings') || '{}')); } catch {} }
  function save() { localStorage.setItem('tools-adb-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('tools-adb-settings') || '{}'), ...settings })); message.success('ADB 操作设置已保存'); }
  onMounted(load);
</script>
<template>
  <n-grid cols="2 s:2 m:2 l:3 xl:3 2xl:3" responsive="screen">
    <n-grid-item>
      <n-form :label-width="80">
        <n-form-item label="录屏最长时长"><n-input-number v-model:value="settings.recordingLimit" :min="30" :max="600" /><span class="ml-2 text-gray-400">秒</span></n-form-item>
        <n-form-item label="保存日志后操作"><n-switch v-model:value="settings.openLogFolder" /><span class="ml-2 text-gray-400">自动打开日志文件夹</span></n-form-item>
        <n-form-item label="Fastboot 操作"><n-switch v-model:value="settings.confirmFastboot" /><span class="ml-2 text-gray-400">进入前显示警告确认</span></n-form-item>
        <n-alert type="warning" :show-icon="true">Fastboot 会中断设备连接，执行前请确认目标设备。</n-alert>
        <n-button class="mt-4" type="primary" @click="save">保存操作设置</n-button>
      </n-form>
    </n-grid-item>
  </n-grid>
</template>