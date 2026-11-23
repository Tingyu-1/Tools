import { RouteRecordRaw } from 'vue-router';
import { PhoneOutlined, VideoCameraOutlined } from '@vicons/antd';
import { Layout } from '@/router/constant';
import { renderIcon } from '@/utils/index';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/android-tools',
    name: 'AndroidTools',
    redirect: '/android-tools/devices',
    component: Layout,
    meta: { title: 'Android 工具', icon: renderIcon(PhoneOutlined), sort: 2 },
    children: [
      {
        path: 'devices',
        name: 'AndroidToolsDevices',
        meta: { title: 'ADB 设备' },
        component: () => import('@/views/tools/android/devices.vue'),
      },
    ],
  },
  {
    path: '/video-tools',
    name: 'VideoTools',
    redirect: '/video-tools/reader',
    component: Layout,
    meta: { title: '视频工具', icon: renderIcon(VideoCameraOutlined), sort: 2 },
    children: [
      {
        path: 'reader',
        name: 'VideoToolsReader',
        meta: { title: '视频读取' },
        component: () => import('@/views/tools/video/reader.vue'),
      },
    ],
  },
];

export default routes;
