<script setup lang="ts">
  import { reactive } from 'vue';
  import AdbPathSetting from './AdbPathSetting.vue';
  import AdbBehaviorSetting from './AdbBehaviorSetting.vue';
  const typeTabList = [{ name: '路径设置', desc: 'ADB 与文件保存目录', key: 1 }, { name: '操作行为', desc: '录屏、日志与安全确认', key: 2 }];
  const state = reactive({ type: 1, typeTitle: '路径设置' });
  function switchType(item: (typeof typeTabList)[number]) { state.type = item.key; state.typeTitle = item.name; }
</script>
<template>
  <div>
    <n-grid :x-gap="24">
      <n-grid-item span="6">
        <n-card :bordered="false" size="small" class="proCard">
          <n-thing class="thing-cell" v-for="item in typeTabList" :key="item.key" :class="{ 'thing-cell-on': state.type === item.key }" @click="switchType(item)">
            <template #header>{{ item.name }}</template><template #description>{{ item.desc }}</template>
          </n-thing>
        </n-card>
      </n-grid-item>
      <n-grid-item span="18">
        <n-card :bordered="false" size="small" :title="state.typeTitle" class="proCard">
          <AdbPathSetting v-if="state.type === 1" />
          <AdbBehaviorSetting v-if="state.type === 2" />
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>
<style lang="less" scoped>
  .thing-cell { margin: 0 -16px 10px; padding: 5px 16px; cursor: pointer; }
  .thing-cell:hover { background: #f3f3f3; }
  .thing-cell-on { background: #f0faff; color: #2d8cf0; }
  .thing-cell-on:hover { background: #f0faff; }
</style>