const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 消息推送接收云函数
 * 用于接收图片安全检测的异步结果
 * 
 * 需要在微信公众平台配置消息推送：
 * 小程序后台 -> 开发 -> 开发设置 -> 消息推送
 */
exports.main = async (event, context) => {
  const db = cloud.database()
  
  // 处理图片检测结果推送
  if (event.MsgType === 'event' && event.Event === 'wxa_media_check') {
    const receiveStartTime = Date.now();
    console.log('[msgReceiver] [时间] ========== 收到图片检测结果推送 ==========');
    console.log('[msgReceiver] [时间] 接收时间:', new Date().toISOString());
    
    const { trace_id, errcode, result, detail } = event
    
    console.log('[msgReceiver] 收到图片检测结果推送:', {
      traceId: trace_id,
      errcode: errcode,
      result: result
    })
    
    try {
      // 立即判断检测结果是否通过
      const checkStartTime = Date.now();
      console.log('[msgReceiver] [时间] 开始判断检测结果...');
      
      let isPass = false;
      let suggest = null;
      let label = null;
      
      if (errcode === 0 && result) {
        suggest = result.suggest;
        label = result.label;
        
        // 判断是否通过：pass 表示通过，risky/review 表示违规
        if (suggest === 'pass') {
          isPass = true;
          console.log('[msgReceiver] 检测结果：通过', { suggest, label });
        } else if (suggest === 'risky' || suggest === 'review') {
          isPass = false;
          console.log('[msgReceiver] 检测结果：违规', { suggest, label });
        } else {
          // 未知状态，默认不通过
          isPass = false;
          console.warn('[msgReceiver] 检测结果：未知状态', { suggest, label });
        }
      } else if (errcode !== 0) {
        // 检测失败
        isPass = false;
        console.error('[msgReceiver] 检测失败，错误码:', errcode);
      }
      
      const checkTime = Date.now() - checkStartTime;
      console.log('[msgReceiver] [时间] 检测结果判断完成，耗时:', checkTime, 'ms，结果:', isPass ? '通过' : '不通过');
      
      // 将结果存储到云数据库（包含判断结果）
      const saveStartTime = Date.now();
      console.log('[msgReceiver] [时间] 开始保存检测结果到数据库...');
      
      await db.collection('security_check_results').add({
        data: {
          traceId: trace_id,
          errcode: errcode,
          result: result || null,
          detail: detail || [],
          createTime: new Date(),
          status: errcode === 0 ? 'success' : 'error',
          isPass: isPass,  // 新增：是否通过
          suggest: suggest,  // 新增：建议
          label: label  // 新增：标签
        }
      })
      
      const saveTime = Date.now() - saveStartTime;
      console.log('[msgReceiver] [时间] 检测结果保存完成，耗时:', saveTime, 'ms');
      
      const totalTime = Date.now() - receiveStartTime;
      console.log('[msgReceiver] [时间] ========== 消息处理完成 ==========');
      console.log('[msgReceiver] [时间] 总耗时:', totalTime, 'ms');
      console.log('[msgReceiver] [时间] 判断耗时:', checkTime, 'ms (', ((checkTime / totalTime) * 100).toFixed(1), '%)');
      console.log('[msgReceiver] [时间] 保存耗时:', saveTime, 'ms (', ((saveTime / totalTime) * 100).toFixed(1), '%)');
      
      return {
        errcode: 0,
        errmsg: 'ok'
      }
    } catch (err) {
      console.error('[msgReceiver] 保存检测结果失败:', err)
      const totalTime = Date.now() - receiveStartTime;
      console.log('[msgReceiver] [时间] ========== 消息处理失败 ==========');
      console.log('[msgReceiver] [时间] 总耗时:', totalTime, 'ms');
      
      return {
        errcode: -1,
        errmsg: '保存失败'
      }
    }
  }
  
  // 其他类型的消息推送（如需要）
  return {
    errcode: 0,
    errmsg: 'ok'
  }
}

