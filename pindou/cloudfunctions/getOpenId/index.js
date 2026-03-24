const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 获取用户openid的辅助云函数
 * 用于内容安全检测时获取用户身份
 */
exports.main = async (event, context) => {
  // 从云函数上下文中获取openid
  const wxContext = cloud.getWXContext()
  
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID
  }
}

