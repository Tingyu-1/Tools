import { defineMock } from '@alova/mock';
import { resultSuccess } from '../_util';
import type { ListDate } from '@/api/system/menu';

const menuList = () => {
  const result: ListDate[] = [
    {
      label: 'Dashboard',
      key: 'dashboard',
      type: 1,
      subtitle: 'dashboard',
      openType: 1,
      auth: 'dashboard',
      path: '/dashboard',
      children: [
        {
          label: '主控台',
          key: 'console',
          type: 1,
          subtitle: 'console',
          openType: 1,
          auth: 'console',
          path: '/dashboard/console',
        },
        {
          label: '工作台',
          key: 'workplace',
          type: 1,
          subtitle: 'workplace',
          openType: 1,
          auth: 'workplace',
          path: '/dashboard/workplace',
        },
      ],
    },
    {
      label: '表单管理',
      key: 'form',
      type: 1,
      subtitle: 'form',
      openType: 1,
      auth: 'form',
      path: '/form',
      children: [
        {
          label: '基础表单',
          key: 'basic-form',
          type: 1,
          subtitle: 'basic-form',
          openType: 1,
          auth: 'basic-form',
          path: '/form/basic-form',
        },
        {
          label: '分步表单',
          key: 'step-form',
          type: 1,
          subtitle: 'step-form',
          openType: 1,
          auth: 'step-form',
          path: '/form/step-form',
        },
        {
          label: '表单详情',
          key: 'detail',
          type: 1,
          subtitle: 'detail',
          openType: 1,
          auth: 'detail',
          path: '/form/detail',
        },
      ],
    },
    {
      label: 'Android 工具',
      key: 'android-tools',
      type: 1,
      subtitle: 'android-tools',
      openType: 1,
      auth: 'android-tools',
      path: '/android-tools',
      children: [
        {
          label: 'ADB 设备',
          key: 'devices',
          type: 1,
          subtitle: 'devices',
          openType: 1,
          auth: 'devices',
          path: '/android-tools/devices',
        },
      ],
    },
    {
      label: '视频工具',
      key: 'video-tools',
      type: 1,
      subtitle: 'video-tools',
      openType: 1,
      auth: 'video-tools',
      path: '/video-tools',
      children: [
        {
          label: '视频读取',
          key: 'reader',
          type: 1,
          subtitle: 'reader',
          openType: 1,
          auth: 'reader',
          path: '/video-tools/reader',
        },
      ],
    },
  ];

  return result;
};

export default defineMock({
  '/api/menu/list': () => {
    const list = menuList();
    return resultSuccess({
      list,
    });
  },
});
