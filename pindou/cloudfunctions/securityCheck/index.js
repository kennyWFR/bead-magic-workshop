const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 内容安全检测云函数
 * 支持图片检测和文本检测
 * 
 * @param {Object} event - 请求参数
 * @param {string} event.type - 检测类型: 'image' | 'text'
 * @param {string} event.content - 文本内容（type='text'时必填）
 * @param {string} event.imageUrl - 图片URL（type='image'时必填，需要是云存储URL或可公网访问的HTTPS URL）
 * @param {string} event.openid - 用户openid（必填）
 * @param {number} event.scene - 场景值：1-资料，2-评论，3-论坛，4-社交日志（默认1）
 * @param {string} event.title - 文本标题（可选，仅文本检测时有效）
 * @param {string} event.nickname - 用户昵称（可选，仅文本检测时有效）
 * 
 * @returns {Object} 检测结果
 */
exports.main = async (event, context) => {
  const functionStartTime = Date.now();
  
  // 格式化时间戳（精确到毫秒）
  const formatTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  };
  
  const logElapsed = (msg) => console.log(`[securityCheck] [${formatTimestamp()}] ${msg}，耗时: ${Date.now() - functionStartTime} ms`);

  console.log(`[securityCheck] [${formatTimestamp()}] ========== 云函数开始执行 ==========`);
  console.log('[securityCheck] 云函数被调用，参数:', JSON.stringify(event))
  
  const { type, content, imageUrl, openid, scene = 1, title, nickname } = event

  // 参数校验
  if (!openid) {
    console.error('[securityCheck] openid 为空')
    return {
      success: false,
      errCode: -1,
      errMsg: 'openid 不能为空'
    }
  }

  if (!type) {
    console.error('[securityCheck] type 为空')
    return {
      success: false,
      errCode: -1,
      errMsg: 'type 不能为空，必须是 "text" 或 "image"'
    }
  }

  if (type === 'text') {
    // ========== 文本内容安全检测 ==========
    if (!content) {
      return {
        success: false,
        errCode: -1,
        errMsg: '文本内容不能为空'
      }
    }

    // 文本长度限制：2500字
    if (content.length > 2500) {
      return {
        success: false,
        errCode: -1,
        errMsg: '文本内容不能超过2500字'
      }
    }

    try {
      const textCheckStartTime = Date.now();
      console.log(`[securityCheck] [${formatTimestamp()}] 开始调用 msgSecCheck API...`);
      
      let result;
      try {
        result = await cloud.openapi.security.msgSecCheck({
          openid: openid,
          scene: scene,
          version: 2,
          content: content,
          ...(title && { title: title }),
          ...(nickname && { nickname: nickname })
        })
      } catch (apiErr) {
        console.error('[securityCheck] msgSecCheck API 调用异常:', apiErr);
        console.error('[securityCheck] API 异常详情:', JSON.stringify(apiErr));
        logElapsed('文本检测分支累计耗时（API异常）');
        return {
          success: false,
          errCode: apiErr.errCode || apiErr.errcode || -1,
          errMsg: apiErr.errMsg || apiErr.errmsg || apiErr.message || '文本检测服务异常'
        }
      }
      
      const textCheckTime = Date.now() - textCheckStartTime;
      console.log(`[securityCheck] [${formatTimestamp()}] msgSecCheck API 调用完成，耗时: ${textCheckTime} ms`);
      console.log('[securityCheck] result 变量存在:', result !== undefined && result !== null);
      console.log('[securityCheck] result 类型:', typeof result);
      
      // 检查返回结果
      if (!result) {
        console.error('[securityCheck] msgSecCheck API 返回结果为空');
        logElapsed('文本检测分支累计耗时');
        return {
          success: false,
          errCode: -1,
          errMsg: '文本检测服务返回结果为空'
        }
      }
      
      // 安全地打印返回结果
      try {
        console.log('[securityCheck] msgSecCheck API 返回结果:', JSON.stringify(result, null, 2));
      } catch (e) {
        console.log('[securityCheck] msgSecCheck API 返回结果（无法序列化）:', result);
        console.log('[securityCheck] 返回结果键:', Object.keys(result || {}));
      }
      
      logElapsed('文本检测分支累计耗时');

      // 处理检测结果
      // 根据接口文档，微信 API 返回的是 snake_case 格式：errcode, errmsg, trace_id
      // 但云调用可能转换为 camelCase，所以兼容两种格式
      const errCode = result.errcode !== undefined ? result.errcode : (result.errCode !== undefined ? result.errCode : undefined);
      const errMsg = result.errmsg !== undefined ? result.errmsg : (result.errMsg !== undefined ? result.errMsg : undefined);
      const errCodeNum = errCode !== undefined && errCode !== null ? Number(errCode) : -1;
      
      console.log('[securityCheck] 原始 errcode:', result.errcode, '原始 errCode:', result.errCode);
      console.log('[securityCheck] 解析后的错误码:', errCodeNum, '类型:', typeof errCodeNum);
      console.log('[securityCheck] 原始 errmsg:', result.errmsg, '原始 errMsg:', result.errMsg);
      console.log('[securityCheck] 解析后的错误信息:', errMsg);
      console.log('[securityCheck] result.result:', result.result);
      console.log('[securityCheck] result.detail:', result.detail);
      console.log('[securityCheck] result.trace_id:', result.trace_id, 'result.traceId:', result.traceId);
      
      if (errCodeNum === 0) {
        // 检测通过
        const suggest = result.result?.suggest || 'pass'
        const label = result.result?.label || 100

        if (suggest === 'risky' || suggest === 'review') {
          // 内容违规或需要人工审核
          return {
            success: false,
            errCode: 87014, // 微信官方定义的违规内容错误码
            errMsg: '内容含有违法违规信息',
            suggest: suggest,
            label: label,
            detail: result.detail || [],
            traceId: result.trace_id
          }
        }

        // 检测通过
        return {
          success: true,
          errCode: 0,
          errMsg: 'ok',
          suggest: suggest,
          label: label,
          traceId: result.traceId || result.trace_id
        }
      } else {
        // 接口调用失败
        console.error('[securityCheck] 文本检测 API 返回错误');
        console.error('[securityCheck] 错误码:', errCodeNum, '类型:', typeof errCodeNum);
        console.error('[securityCheck] 错误信息:', errMsg);
        console.error('[securityCheck] 完整返回结果:', JSON.stringify(result));
        return {
          success: false,
          errCode: errCodeNum,
          errMsg: errMsg || '文本检测失败',
          traceId: result.traceId || result.trace_id
        }
      }
    } catch (err) {
      console.error('[securityCheck] 文本安全检测异常:', err);
      console.error('[securityCheck] 异常详情:', JSON.stringify(err));
      return {
        success: false,
        errCode: err.errCode || err.errcode || -1,
        errMsg: err.errMsg || err.errmsg || err.message || '文本检测服务异常，请稍后重试'
      }
    }
  } else if (type === 'image') {
    // ========== 图片内容安全检测（异步） ==========
    console.log('[securityCheck] 开始图片检测，imageUrl:', imageUrl)
    
    if (!imageUrl) {
      console.error('[securityCheck] 图片URL为空')
      return {
        success: false,
        errCode: -1,
        errMsg: '图片URL不能为空'
      }
    }

    // 验证URL格式（必须是HTTPS或云存储URL）
    if (!imageUrl.startsWith('https://') && !imageUrl.startsWith('cloud://')) {
      console.error('[securityCheck] 图片URL格式错误:', imageUrl)
      return {
        success: false,
        errCode: -1,
        errMsg: '图片URL必须是HTTPS链接或云存储链接'
      }
    }

    try {
      const imageCheckStartTime = Date.now();
      console.log(`[securityCheck] [${formatTimestamp()}] 开始图片检测流程...`);
      
      // 如果是云存储URL，需要转换为HTTPS URL
      let finalImageUrl = imageUrl
      if (imageUrl.startsWith('cloud://')) {
        const getTempUrlStartTime = Date.now();
        console.log(`[securityCheck] [${formatTimestamp()}] 开始转换云存储URL为HTTPS URL...`);
        console.log('[securityCheck] 转换云存储URL为HTTPS URL，原始URL:', imageUrl)
        
        // imageUrl 是 uploadFile 返回的 fileID，格式：cloud://环境ID.文件ID
        // 例如：cloud://cloud1-7gkvoq250e0fc0b6.636c-cloud1-7gkvoq250e0fc0b6-1351972728/security-check/xxx.jpg
        // 
        // 根据微信云开发文档，getTempFileURL 可以直接接受完整的 cloud:// URL
        // 如果不行，再尝试提取文件ID部分（点后面的内容）
        
        // 方法1：直接使用完整的 cloud:// URL（uploadFile 返回的 fileID）
        try {
          const method1StartTime = Date.now();
          console.log(`[securityCheck] [${formatTimestamp()}] 方法1: 使用完整的 cloud:// URL`);
          const fileInfo1 = await cloud.getTempFileURL({
            fileList: [imageUrl] // 直接使用 uploadFile 返回的 fileID
          })
          const method1Time = Date.now() - method1StartTime;
          console.log(`[securityCheck] [${formatTimestamp()}] 方法1 getTempFileURL 完成，耗时: ${method1Time} ms`);
          
          if (fileInfo1.fileList && fileInfo1.fileList[0] && fileInfo1.fileList[0].tempFileURL) {
            finalImageUrl = fileInfo1.fileList[0].tempFileURL
            console.log('[securityCheck] 成功获取临时链接 (方法1):', finalImageUrl)
          } else if (fileInfo1.fileList && fileInfo1.fileList[0]) {
            const fileItem = fileInfo1.fileList[0]
            console.log('[securityCheck] 方法1失败，错误信息:', fileItem.errMsg || fileItem.code || fileItem.status)
            // 如果方法1失败，尝试方法2
            throw new Error('方法1失败，尝试方法2')
          } else {
            throw new Error('方法1失败，文件列表为空')
          }
        } catch (err1) {
          console.log('[securityCheck] 方法1失败，尝试方法2 (提取文件ID):', err1.message)
          
          // 方法2：提取文件ID部分（点后面的内容）
          // 云存储URL格式：cloud://环境ID.文件ID
          // 需要提取：636c-cloud1-7gkvoq250e0fc0b6-1351972728/security-check/xxx.jpg
          const withoutPrefix = imageUrl.replace('cloud://', '')
          const dotIndex = withoutPrefix.indexOf('.')
          
          if (dotIndex === -1) {
            console.error('[securityCheck] 云存储URL格式错误，找不到环境ID和文件ID的分隔符')
            return {
              success: false,
              errCode: -1,
              errMsg: '云存储URL格式错误'
            }
          }
          
          // 提取文件ID（第一个点后面的所有内容）
          const extractedFileId = withoutPrefix.substring(dotIndex + 1)
          console.log('[securityCheck] 提取的文件ID:', extractedFileId)
          
          try {
            const method2StartTime = Date.now();
            console.log(`[securityCheck] [${formatTimestamp()}] 方法2: 使用提取的文件ID`);
            const fileInfo2 = await cloud.getTempFileURL({
              fileList: [extractedFileId]
            })
            const method2Time = Date.now() - method2StartTime;
            console.log(`[securityCheck] [${formatTimestamp()}] 方法2 getTempFileURL 完成，耗时: ${method2Time} ms`);
            
            if (fileInfo2.fileList && fileInfo2.fileList[0] && fileInfo2.fileList[0].tempFileURL) {
              finalImageUrl = fileInfo2.fileList[0].tempFileURL
              console.log('[securityCheck] 成功获取临时链接 (方法2):', finalImageUrl)
            } else {
              console.error('[securityCheck] 方法2也失败')
              console.error('[securityCheck] fileInfo2:', JSON.stringify(fileInfo2))
              if (fileInfo2.fileList && fileInfo2.fileList[0]) {
                const fileItem = fileInfo2.fileList[0]
                console.error('[securityCheck] 文件信息:', JSON.stringify(fileItem))
                if (fileItem.code || fileItem.status) {
                  console.error('[securityCheck] 错误代码:', fileItem.code || fileItem.status)
                  console.error('[securityCheck] 错误信息:', fileItem.errMsg)
                }
                return {
                  success: false,
                  errCode: -1,
                  errMsg: `无法获取云存储文件链接: ${fileItem.errMsg || fileItem.code || fileItem.status || '未知错误'}`
                }
              }
              return {
                success: false,
                errCode: -1,
                errMsg: '无法获取云存储文件链接: 文件列表为空'
              }
            }
          } catch (err2) {
            console.error('[securityCheck] 两种方法都失败')
            console.error('[securityCheck] 错误1:', err1)
            console.error('[securityCheck] 错误2:', err2)
            return {
              success: false,
              errCode: -1,
              errMsg: `无法获取云存储文件链接: ${err2.message || '未知错误'}`
            }
          }
        }
        
        const getTempUrlTime = Date.now() - getTempUrlStartTime;
        console.log(`[securityCheck] [${formatTimestamp()}] 云存储URL转换完成，总耗时: ${getTempUrlTime} ms`);
        logElapsed('完成 URL 转换累计耗时');
      }

      const mediaCheckStartTime = Date.now();
      console.log(`[securityCheck] [${formatTimestamp()}] 开始调用 mediaCheckAsync API...`);
      console.log('[securityCheck] 调用 mediaCheckAsync，参数:', {
        openid,
        scene,
        version: 2,
        media_url: finalImageUrl,
        media_type: 2
      })

      // 调用异步图片检测接口
      const result = await cloud.openapi.security.mediaCheckAsync({
        openid: openid,
        scene: scene,
        version: 2,
        media_url: finalImageUrl,
        media_type: 2 // 2-图片
      })
      const mediaCheckTime = Date.now() - mediaCheckStartTime;
      console.log(`[securityCheck] [${formatTimestamp()}] mediaCheckAsync API 调用完成，耗时: ${mediaCheckTime} ms`);
      logElapsed('提交异步检测累计耗时');

      // 注意：微信云开发返回的字段可能是 errCode（大写C）或 errcode（小写c）
      // 需要兼容两种格式
      let errCode = result.errCode !== undefined ? result.errCode : result.errcode
      const errMsg = result.errMsg !== undefined ? result.errMsg : result.errmsg
      const traceId = result.traceId !== undefined ? result.traceId : result.trace_id

      // 确保 errCode 是数字类型进行比较（处理字符串 "0" 的情况）
      const errCodeNum = errCode !== undefined && errCode !== null ? Number(errCode) : -1

      // 如果 errCodeNum 是 0，说明调用成功
      if (errCodeNum === 0) {
        // 异步检测已提交，返回trace_id
        const response = {
          success: true,
          errCode: 0,
          errMsg: '图片检测已提交，请等待结果',
          traceId: traceId,
          isAsync: true, // 标记为异步检测
          note: '图片检测为异步处理，结果将在30分钟内通过消息推送返回'
        }
        console.log('[securityCheck] 返回成功结果:', JSON.stringify(response))
        logElapsed('图片分支累计耗时（提交成功）');
        return response
      } else {
        const response = {
          success: false,
          errCode: errCodeNum,
          errMsg: errMsg || '图片检测提交失败',
          traceId: traceId
        }
        console.error('[securityCheck] 检测提交失败:', JSON.stringify(response))
        console.error('[securityCheck] 失败原因: errCodeNum =', errCodeNum, '不等于 0')
        logElapsed('图片分支累计耗时（提交失败）');
        return response
      }
    } catch (err) {
      console.error('[securityCheck] 图片安全检测异常:', err)
      console.error('[securityCheck] 错误详情:', JSON.stringify(err))
      logElapsed('图片分支累计耗时（异常）');
      return {
        success: false,
        errCode: err.errCode || err.errCode || -1,
        errMsg: err.errMsg || err.message || '图片检测服务异常，请稍后重试'
      }
    }
  } else {
    console.error('[securityCheck] 不支持的检测类型:', type)
    logElapsed('类型错误分支累计耗时');
    return {
      success: false,
      errCode: -1,
      errMsg: '不支持的检测类型，type必须是 "text" 或 "image"'
    }
  }
}

