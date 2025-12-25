<template>
  <view class="app">
    <slot />
  </view>
</template>

<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
// #ifdef MP-WEIXIN
import initCloud from '@/utils/cloud-init';
import { preloadOpenId, prepareWatchConnection } from '@/utils/securityCheck';
// #endif

onLaunch(() => {
  console.log('App Launch');
  // #ifdef MP-WEIXIN
  initCloud();
  // 预取 openid，减少后续检测时延
  preloadOpenId().catch((e) => {
    console.warn('[App] preloadOpenId 失败：', e);
  });
  // 预热 watch 连接，减少首次检测时的建链耗时
  // 延迟一下，确保云开发初始化完成
  setTimeout(() => {
    prepareWatchConnection().catch((e) => {
      console.warn('[App] prepareWatchConnection 失败：', e);
    });
  }, 500);
  // #endif
});

onShow(() => {
  console.log('App Show');
});

onHide(() => {
  console.log('App Hide');
});
</script>

<style lang="scss">
@import '@/uni.scss';
</style>
