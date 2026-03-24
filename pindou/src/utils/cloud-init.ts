// #ifdef MP-WEIXIN
export default function initCloud() {
  if (typeof wx !== 'undefined' && wx.cloud) {
    wx.cloud.init({
      env: 'cloud1-7gkvoq250e0fc0b6',
      traceUser: true
    });
    console.log('云开发初始化成功');
  } else {
    console.warn('当前环境不支持云开发');
  }
}
// #endif

