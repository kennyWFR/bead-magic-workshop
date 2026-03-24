/**
 * 内容安全检测工具函数
 * 基于微信云开发实现
 */

// 兼容 uni 全局类型缺失
declare const uni: any;

interface SecurityCheckResult {
  success: boolean
  errCode: number
  errMsg: string
  suggest?: string
  label?: number
  traceId?: string
  isAsync?: boolean
  detail?: any[]
}

// openid 缓存，避免每次都调用云函数
let cachedOpenId: string | null = null
let preloadOpenIdPromise: Promise<string | null> | null = null
const OPENID_STORAGE_KEY = 'security_check_openid'

// 预热 watch 连接
let watchPrepared = false
let watchPreparePromise: Promise<void> | null = null
let watchLastPrepareTime = 0 // 记录上次预热时间
const WATCH_PREPARE_INTERVAL = 5 * 60 * 1000 // 5分钟重新预热一次，保持连接活跃

/** 异步图片风控：数据库 watch 最长等待时间（毫秒） */
const WATCH_IMAGE_SECURITY_MAX_MS = 15 * 1000

/**
 * 格式化时间戳（精确到毫秒）
 * @returns 格式化的时间字符串，如 "2025-01-15 14:30:45.123"
 */
function formatTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/**
 * 检测文本内容是否安全
 * @param content 待检测的文本内容
 * @param scene 场景值：1-资料，2-评论，3-论坛，4-社交日志（默认1）
 * @param title 文本标题（可选）
 * @param nickname 用户昵称（可选）
 * @returns 检测结果
 */
/**
 * 获取用户openid（uni-app适配）
 */
async function getOpenId(): Promise<string> {
  // 命中内存缓存
  if (cachedOpenId) return cachedOpenId

  // 尝试读取本地缓存
  try {
    const stored = await uni.getStorage({ key: OPENID_STORAGE_KEY })
    if (stored?.data) {
      cachedOpenId = stored.data
      return cachedOpenId || ''
    }
  } catch (_) {
    // ignore
  }

  // #ifdef MP-WEIXIN
  try {
    // uni-app在微信小程序中，云函数会自动传递openid
    // 但为了确保，我们调用辅助云函数获取
    console.log('[securityCheck] getOpenId: start callFunction(getOpenId)');
    const cloudRes = await uni.cloud.callFunction({
      name: 'getOpenId',
      data: {}
    })
    const openid = cloudRes.result?.openid || ''
    console.log('[securityCheck] getOpenId: success, openid=', openid)
    cachedOpenId = openid || null
    // 持久化
    if (cachedOpenId) {
      try {
        await uni.setStorage({ key: OPENID_STORAGE_KEY, data: cachedOpenId })
      } catch (_) {
        // ignore
      }
    }
    return openid
  } catch (e) {
    const errObj = e as Record<string, any>;
    const errCode = errObj?.errCode || errObj?.err_code || errObj?.code;
    const errMsg = errObj?.errMsg || errObj?.message || '';
    console.warn('[securityCheck] getOpenId failed:', errCode, errMsg, e);
    if (errCode === -501000) {
      console.warn('[securityCheck] getOpenId 提示：请确认已上传并部署云函数 getOpenId');
    }
    return ''
  }
  // #endif
  
  // #ifndef MP-WEIXIN
  // 非微信小程序环境，返回空（内容安全检测仅支持微信小程序）
  console.warn('内容安全检测仅支持微信小程序环境')
  return ''
  // #endif
}

/**
 * 应用启动时预取 openid，减少后续调用延迟
 */
export async function preloadOpenId(): Promise<string | null> {
  if (preloadOpenIdPromise) return preloadOpenIdPromise
  preloadOpenIdPromise = (async () => {
    const id = await getOpenId()
    return id || null
  })().finally(() => {
    preloadOpenIdPromise = null
  })
  return preloadOpenIdPromise
}

export async function checkText(
  content: string,
  scene: number = 1,
  title?: string,
  nickname?: string
): Promise<SecurityCheckResult> {
  // #ifndef MP-WEIXIN
  // 非微信小程序环境，直接返回通过（开发环境）
  console.warn('内容安全检测仅支持微信小程序环境，当前环境跳过检测')
  return {
    success: true,
    errCode: 0,
    errMsg: 'ok'
  }
  // #endif

  // #ifdef MP-WEIXIN
  if (!uni.cloud) {
    console.error('[securityCheck] uni.cloud 不可用，请确认已初始化云开发')
    return {
      success: false,
      errCode: -1,
      errMsg: '云开发未初始化，无法进行内容安全检测'
    }
  }

  try {
    // 获取用户openid
    const openid = await getOpenId()
    if (!openid) {
      console.error('[securityCheck] checkText: openid 获取失败，可能未登录或未部署 getOpenId 云函数')
      return {
        success: false,
        errCode: -1,
        errMsg: '无法获取用户身份信息，请确保已登录并已部署 getOpenId 云函数'
      }
    }

    console.log('[securityCheck] checkText: start callFunction(securityCheck)', {
      scene,
      hasTitle: !!title,
      hasNickname: !!nickname,
      contentLength: content?.length || 0
    })

    // 调用云函数进行文本检测
    const result = await uni.cloud.callFunction({
      name: 'securityCheck',
      data: {
        type: 'text',
        content: content,
        openid: openid,
        scene: scene,
        ...(title && { title: title }),
        ...(nickname && { nickname: nickname })
      }
    })

    console.log('[securityCheck] checkText: callFunction result', result)
    return result.result as SecurityCheckResult
  } catch (error: any) {
    console.error('[securityCheck] checkText exception:', error)
    return {
      success: false,
      errCode: -1,
      errMsg: error.message || '文本检测服务异常，请稍后重试'
    }
  }
  // #endif
}

/**
 * 检测图片内容是否安全
 * @param imagePath 图片本地路径或云存储fileID
 * @param scene 场景值：1-资料，2-评论，3-论坛，4-社交日志（默认1）
 * @returns 检测结果（注意：图片检测是异步的）
 */
export async function checkImage(
  imagePath: string,
  scene: number = 1
): Promise<SecurityCheckResult> {
  // #ifndef MP-WEIXIN
  // 非微信小程序环境，直接返回通过（开发环境）
  console.warn('内容安全检测仅支持微信小程序环境，当前环境跳过检测')
  return {
    success: true,
    errCode: 0,
    errMsg: 'ok'
  }
  // #endif

  // #ifdef MP-WEIXIN
  if (!uni.cloud) {
    console.error('[securityCheck] uni.cloud 不可用，请确认已初始化云开发')
    return {
      success: false,
      errCode: -1,
      errMsg: '云开发未初始化，无法进行内容安全检测'
    }
  }

  try {
    const checkImageStartTime = Date.now();
    console.log(`[securityCheck] [${formatTimestamp()}] checkImage 函数开始执行`);
    
    // 获取用户openid
    const getOpenIdStartTime = Date.now();
    console.log(`[securityCheck] [${formatTimestamp()}] 开始获取 openid...`);
    const openid = await getOpenId()
    const getOpenIdTime = Date.now() - getOpenIdStartTime;
    console.log(`[securityCheck] [${formatTimestamp()}] 获取 openid 完成，耗时: ${getOpenIdTime} ms`);
    
    if (!openid) {
      console.error('[securityCheck] checkImage: openid 获取失败，可能未登录或未部署 getOpenId 云函数')
      return {
        success: false,
        errCode: -1,
        errMsg: '无法获取用户身份信息，请确保已登录并已部署 getOpenId 云函数'
      }
    }

    // 判断是本地路径还是云存储fileID
    let imageUrl = imagePath

    // 如果是本地路径（以 / 开头或包含临时文件路径），需要先上传到云存储
    if (imagePath.startsWith('/') || imagePath.includes('tmp/') || imagePath.includes('wxfile://')) {
      // 上传图片到云存储
      const uploadStartTime = Date.now();
      console.log(`[securityCheck] [${formatTimestamp()}] 开始上传图片到云存储...`);
      console.log('[securityCheck] checkImage: upload local image to cloud', imagePath)
      const uploadRes = await uni.cloud.uploadFile({
        cloudPath: `security-check/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
        filePath: imagePath
      })
      const uploadTime = Date.now() - uploadStartTime;
      console.log(`[securityCheck] [${formatTimestamp()}] 图片上传完成，耗时: ${uploadTime} ms`);

      if (!uploadRes.fileID) {
        console.error('[securityCheck] checkImage: upload failed', uploadRes)
        return {
          success: false,
          errCode: -1,
          errMsg: '图片上传失败'
        }
      }

      imageUrl = uploadRes.fileID // 使用云存储fileID
      console.log('[securityCheck] checkImage: upload success, fileID=', imageUrl)
    }

    console.log('[securityCheck] checkImage: start callFunction(securityCheck)', {
      scene,
      imageUrl
    })

    // 调用云函数进行图片检测
    const callFunctionStartTime = Date.now();
    console.log('[securityCheck] [时间] 开始调用 securityCheck 云函数...');
    const result = await uni.cloud.callFunction({
      name: 'securityCheck',
      data: {
        type: 'image',
        imageUrl: imageUrl,
        openid: openid,
        scene: scene
      }
    })
    const callFunctionTime = Date.now() - callFunctionStartTime;
    console.log('[securityCheck] [时间] securityCheck 云函数调用完成，耗时:', callFunctionTime, 'ms');

    console.log('[securityCheck] checkImage: callFunction 原始返回:', result)
    const checkResult = result.result as SecurityCheckResult
    console.log('[securityCheck] checkImage: callFunction result', checkResult)
    
    // 检查返回结果格式是否正确
    if (!checkResult || typeof checkResult !== 'object' || !('success' in checkResult)) {
      console.error('[securityCheck] checkImage: 返回结果格式错误，可能是云函数未正确返回', checkResult)
      // 如果返回的是请求参数，说明云函数可能出错了
      if (checkResult && 'type' in checkResult && 'imageUrl' in checkResult) {
        return {
          success: false,
          errCode: -1,
          errMsg: '云函数返回格式错误，请检查云函数代码或重新部署'
        }
      }
    }
    
    // 如果检测失败，输出详细错误信息（帮助调试）
    if (!checkResult.success) {
      console.error('[securityCheck] checkImage: 检测失败')
      console.error('[securityCheck] checkImage: 错误代码:', checkResult.errCode)
      console.error('[securityCheck] checkImage: 错误信息:', checkResult.errMsg)
      console.warn('[securityCheck] 提示: 云函数的详细日志请到云开发控制台查看')
      console.warn('[securityCheck] 查看方法: 微信开发者工具 -> 云开发 -> 云函数 -> securityCheck -> 日志')
    }

    // 如果是异步检测，需要等待结果
    if (checkResult.isAsync && checkResult.traceId) {
      const traceId: string = checkResult.traceId as string // 类型断言，因为已经在 if 条件中检查
      console.log('[securityCheck] 图片检测已提交，traceId:', traceId)
      
      // 更新加载提示
      uni.showLoading({ title: '图片合规检测', mask: true });
      
      const watchStartTime = Date.now();
      console.log(`[securityCheck] [${formatTimestamp()}] 开始实时监听检测结果...`);
      console.log(`[securityCheck] [${formatTimestamp()}] watchImageCheckResult 调用前，checkImage 已耗时: ${watchStartTime - checkImageStartTime} ms`);
      
      // 使用实时监听替代轮询
      const finalResult = await watchImageCheckResult(traceId, WATCH_IMAGE_SECURITY_MAX_MS)
      
      const watchEndTime = Date.now();
      const watchTime = watchEndTime - watchStartTime;
      console.log('[securityCheck] [时间] 实时监听完成，总耗时:', watchTime, 'ms');
      console.log('[securityCheck] [时间] watchImageCheckResult 返回后，checkImage 已耗时:', watchEndTime - checkImageStartTime, 'ms');
      
      if (!finalResult) {
        // 超时或查询失败
        console.warn('[securityCheck] 检测结果查询超时或失败')
        const checkImageTotalTime = Date.now() - checkImageStartTime;
        console.log(`[securityCheck] [${formatTimestamp()}] checkImage 函数执行完成（超时），总耗时: ${checkImageTotalTime} ms`);
        return {
          success: false,
          errCode: -1,
          errMsg: '图片检测超时，请稍后重试'
        }
      }
      
      // 返回最终检测结果（此时 finalResult 不为 null）
      const returnTime = Date.now();
      console.log(`[securityCheck] [${formatTimestamp()}] 准备返回结果，checkImage 已耗时: ${returnTime - checkImageStartTime} ms`);
      const checkImageTotalTime = Date.now() - checkImageStartTime;
      console.log(`[securityCheck] [${formatTimestamp()}] checkImage 函数执行完成（异步检测），总耗时: ${checkImageTotalTime} ms`);
      return finalResult as SecurityCheckResult
    }

    const checkImageTotalTime = Date.now() - checkImageStartTime;
    console.log(`[securityCheck] [${formatTimestamp()}] checkImage 函数执行完成，总耗时: ${checkImageTotalTime} ms`);
    return checkResult
  } catch (error: any) {
    console.error('[securityCheck] checkImage exception:', error)
    return {
      success: false,
      errCode: -1,
      errMsg: error.message || '图片检测服务异常，请稍后重试'
    }
  }
  // #endif
}

/**
 * 预热 watch 连接，减少正式监听时的建链耗时
 */
export async function prepareWatchConnection(): Promise<void> {
  // 如果已经预热过，且距离上次预热时间不超过 5 分钟，直接返回
  const now = Date.now()
  if (watchPrepared && (now - watchLastPrepareTime) < WATCH_PREPARE_INTERVAL) {
    return Promise.resolve()
  }
  
  // 如果正在预热，等待完成
  if (watchPreparePromise) return watchPreparePromise

  // #ifndef MP-WEIXIN
  watchPrepared = true
  watchLastPrepareTime = now
  return Promise.resolve()
  // #endif

  // #ifdef MP-WEIXIN
  watchPreparePromise = (async () => {
    try {
      if (!uni.cloud) return
      const db = uni.cloud.database()
      const start = Date.now()
      console.log(`[securityCheck] [${formatTimestamp()}] 开始预热 watch 连接...`)
      const task = db.collection('security_check_results')
        .limit(1)
        .watch({
          onChange: () => {
            try {
              task.close()
            } catch (error: any) {
              // 忽略关闭错误
              console.warn('[securityCheck] 预热 watch 关闭时出错（可忽略）:', error.message);
            }
            watchPrepared = true
            watchLastPrepareTime = Date.now()
            console.log(`[securityCheck] [${formatTimestamp()}] watch 预热完成，耗时: ${Date.now() - start} ms`)
          },
          onError: (error: any) => {
            try {
              task.close()
            } catch (closeError: any) {
              // 忽略关闭错误
              console.warn('[securityCheck] 预热 watch 错误处理中关闭时出错（可忽略）:', closeError.message);
            }
          }
        })
      // 最长等待 2 秒，避免卡住
      await new Promise(resolve => setTimeout(resolve, 2000))
      if (!watchPrepared) {
        try { 
          task.close() 
        } catch (error: any) {
          // 忽略关闭错误（连接可能已经关闭）
          console.warn('[securityCheck] 预热超时关闭时出错（可忽略）:', error.message);
        }
      }
      watchPrepared = true
      watchLastPrepareTime = Date.now()
    } catch (e) {
      console.warn('[securityCheck] watch 预热失败', e)
    } finally {
      watchPreparePromise = null
    }
  })()
  return watchPreparePromise!
  // #endif
}

/**
 * 实时监听图片检测结果（使用云数据库 watch 功能）
 * @param traceId 检测任务的 traceId
 * @param maxWaitTime 最大等待时间（毫秒），默认15秒
 * @returns 检测结果，如果超时返回 null
 */
export async function watchImageCheckResult(
  traceId: string,
  maxWaitTime: number = WATCH_IMAGE_SECURITY_MAX_MS
): Promise<SecurityCheckResult | null> {
  // #ifndef MP-WEIXIN
  // 非微信小程序环境，直接返回通过
  console.warn('[securityCheck] 实时监听功能仅支持微信小程序环境')
  return {
    success: true,
    errCode: 0,
    errMsg: 'ok'
  }
  // #endif

  // #ifdef MP-WEIXIN
  if (!uni.cloud) {
    console.error('[securityCheck] uni.cloud 不可用，无法监听检测结果')
    return null
  }

  // 预热监听，减少建链耗时（如果未预热，快速预热）
  const prepareStartTime = Date.now();
  await prepareWatchConnection()
  const prepareTime = Date.now() - prepareStartTime;
  if (prepareTime > 100) {
    console.log(`[securityCheck] [${formatTimestamp()}] watch 预热耗时: ${prepareTime} ms`);
  }

  const startTime = Date.now()
  const db = uni.cloud.database()
  
  console.log(`[securityCheck] [${formatTimestamp()}] 实时监听开始，traceId: ${traceId}，最大等待时间: ${maxWaitTime} ms`)
  
  return new Promise((resolve) => {
    // 设置超时
    let watchTask: any = null
    let isResolved = false // 防止重复 resolve
    
    // 安全关闭 watch 连接的辅助函数
    const safeCloseWatch = () => {
      if (watchTask && !isResolved) {
        try {
          watchTask.close();
        } catch (error: any) {
          // 忽略关闭错误（连接可能已经关闭）
          console.warn('[securityCheck] 关闭 watch 连接时出错（可忽略）:', error.message);
        }
      }
    };
    
    const timeout = setTimeout(() => {
      if (isResolved) return;
      const totalTime = Date.now() - startTime;
      console.warn(`[securityCheck] [${formatTimestamp()}] 实时监听超时，未找到检测结果，总耗时: ${totalTime} ms`);
      isResolved = true;
      safeCloseWatch();
      resolve(null);
    }, maxWaitTime);
    
    // 使用 watch 实时监听数据库变化
    const watchStartTime = Date.now();
    console.log(`[securityCheck] [${formatTimestamp()}] 开始建立数据库监听...`);
    
    watchTask = db.collection('security_check_results')
      .where({
        traceId: traceId
      })
      .watch({
        onChange: (snapshot: any) => {
          if (isResolved) return; // 如果已经 resolve，忽略后续事件
          
          const watchTime = Date.now() - watchStartTime;
          // 只在首次建立连接或找到结果时输出详细日志
          if (snapshot.type === 'init') {
            console.log(`[securityCheck] [${formatTimestamp()}] 数据库监听连接建立，耗时: ${watchTime} ms`);
          }
          
          if (snapshot.docChanges && snapshot.docChanges.length > 0) {
            // 找到新增或更新的记录
            const change = snapshot.docChanges.find((c: any) => c.dataType === 'add' || c.dataType === 'update');
            if (change && change.doc) {
              const result = change.doc;
              const totalTime = Date.now() - startTime;
              console.log(`[securityCheck] [${formatTimestamp()}] 找到检测结果，总监听时间: ${totalTime} ms`);
              
              // 标记已解决，防止重复处理
              isResolved = true;
              clearTimeout(timeout);
              safeCloseWatch();
              
              // 判断结果（优先使用 msgReceiver 已判断的结果）
              if (result.isPass !== undefined) {
                // 使用 msgReceiver 已判断的结果
                if (result.isPass) {
                  console.log('[securityCheck] 检测结果：通过（使用 msgReceiver 判断结果）');
                  resolve({
                    success: true,
                    errCode: 0,
                    errMsg: 'ok',
                    suggest: result.suggest,
                    label: result.label,
                    traceId: traceId
                  });
                } else {
                  console.log('[securityCheck] 检测结果：违规（使用 msgReceiver 判断结果）');
                  resolve({
                    success: false,
                    errCode: 87014,
                    errMsg: '图片含有违法违规信息',
                    suggest: result.suggest,
                    label: result.label,
                    traceId: traceId
                  });
                }
              } else if (result.errcode === 0 && result.result) {
                // 兼容旧数据格式，手动判断
                const suggest = result.result.suggest;
                const label = result.result.label;
                
                if (suggest === 'risky' || suggest === 'review') {
                  console.log('[securityCheck] 检测结果：违规', { suggest, label });
                  resolve({
                    success: false,
                    errCode: 87014,
                    errMsg: '图片含有违法违规信息',
                    suggest: suggest,
                    label: label,
                    traceId: traceId
                  });
                } else {
                  console.log('[securityCheck] 检测结果：通过', { suggest, label });
                  resolve({
                    success: true,
                    errCode: 0,
                    errMsg: 'ok',
                    suggest: suggest,
                    label: label,
                    traceId: traceId
                  });
                }
              } else if (result.errcode !== 0) {
                console.error('[securityCheck] 检测失败，错误码:', result.errcode);
                isResolved = true;
                clearTimeout(timeout);
                safeCloseWatch();
                resolve({
                  success: false,
                  errCode: result.errcode,
                  errMsg: '图片检测失败',
                  traceId: traceId
                });
              }
            }
          }
        },
        onError: (error: any) => {
          if (isResolved) return; // 如果已经 resolve，忽略错误
          
          console.error('[securityCheck] 数据库监听错误:', error);
          isResolved = true;
          clearTimeout(timeout);
          safeCloseWatch();
          resolve(null);
        }
      });
  });
  // #endif
}

/** 风控上传图：总像素上限（例如 200×200） */
const SECURITY_CHECK_MAX_PIXELS = 40000
/** 风控上传图：默认文件大小上限（KB） */
const SECURITY_CHECK_MAX_SIZE_KB_DEFAULT = 30
const SECURITY_CHECK_MIN_QUALITY = 20

function getFileSizeBytes(filePath: string): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      uni.getFileSystemManager().getFileInfo({
        filePath,
        success: (res: { size?: number }) => resolve(typeof res.size === 'number' ? res.size : null),
        fail: () => resolve(null)
      })
    } catch {
      resolve(null)
    }
  })
}

/**
 * 将分辨率限制在总像素不超过 maxPixels（不放大）
 */
function scaleToMaxPixelCount(
  width: number,
  height: number,
  maxPixels: number
): { w: number; h: number } {
  const area = width * height
  if (area <= maxPixels) {
    return { w: width, h: height }
  }
  const scale = Math.sqrt(maxPixels / area)
  let w = Math.max(1, Math.floor(width * scale))
  let h = Math.max(1, Math.floor(height * scale))
  while (w * h > maxPixels) {
    if (w >= h) w--
    else h--
  }
  return { w, h }
}

/**
 * 压缩图片（用于上传前压缩，减少流量和检测时间）
 * 默认：总像素 ≤ 40000，文件尽量 ≤ maxSizeKB（通过 quality / 必要时略缩分辨率达成）
 * @param imagePath 图片本地路径
 * @param maxSizeKB 最大文件大小（KB），默认 30
 * @returns 压缩后的图片路径
 */
export async function compressImage(
  imagePath: string,
  maxSizeKB: number = SECURITY_CHECK_MAX_SIZE_KB_DEFAULT
): Promise<string> {
  try {
    const imageInfo = await uni.getImageInfo({
      src: imagePath
    })

    const originalWidth = imageInfo.width
    const originalHeight = imageInfo.height
    let { w: targetWidth, h: targetHeight } = scaleToMaxPixelCount(
      originalWidth,
      originalHeight,
      SECURITY_CHECK_MAX_PIXELS
    )

    if (targetWidth !== originalWidth || targetHeight !== originalHeight) {
      console.log(
        '[securityCheck] 风控缩图:',
        originalWidth,
        'x',
        originalHeight,
        '->',
        targetWidth,
        'x',
        targetHeight,
        `(像素 ${targetWidth * targetHeight}/${SECURITY_CHECK_MAX_PIXELS})`
      )
    }

    const maxBytes = Math.max(1024, Math.floor(maxSizeKB * 1024))
    let quality = 75
    let lastPath = imagePath
    const maxAttempts = 24

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const compressRes = await uni.compressImage({
        src: imagePath,
        quality,
        compressedHeight: targetHeight,
        compressedWidth: targetWidth
      })
      lastPath = compressRes.tempFilePath

      const sizeBytes = await getFileSizeBytes(lastPath)
      if (sizeBytes === null || sizeBytes <= maxBytes) {
        if (sizeBytes !== null) {
          console.log(
            '[securityCheck] 压缩完成:',
            (sizeBytes / 1024).toFixed(2),
            'KB',
            targetWidth,
            'x',
            targetHeight,
            'q=',
            quality
          )
        }
        return lastPath
      }

      if (quality > SECURITY_CHECK_MIN_QUALITY) {
        quality = Math.max(SECURITY_CHECK_MIN_QUALITY, quality - 8)
        continue
      }

      const area = targetWidth * targetHeight
      if (area <= 2500) {
        console.warn('[securityCheck] 已达较小分辨率仍超过体积上限，使用当前结果', {
          targetWidth,
          targetHeight,
          sizeBytes
        })
        return lastPath
      }

      const shrink = Math.sqrt(0.82)
      targetWidth = Math.max(1, Math.floor(targetWidth * shrink))
      targetHeight = Math.max(1, Math.floor(targetHeight * shrink))
      const scaled = scaleToMaxPixelCount(targetWidth, targetHeight, SECURITY_CHECK_MAX_PIXELS)
      targetWidth = scaled.w
      targetHeight = scaled.h
      quality = 75
    }

    return lastPath
  } catch (error: any) {
    console.error('图片压缩失败:', error)
    return imagePath
  }
}

/**
 * 错误码映射为友好提示信息
 */
export function getSecurityErrorMessage(errCode: number): string {
  const errorMap: Record<number, string> = {
    87014: '内容含有违法违规信息，请修改后重试',
    40001: '身份验证失败，请重新登录',
    40003: '用户身份无效，请重新登录',
    40129: '场景值错误',
    43104: '用户身份不匹配',
    44991: '请求过于频繁，请稍后再试',
    45009: '今日检测次数已达上限',
    47001: '数据格式错误',
    61010: '用户访问记录超时，请重新进入小程序',
    '-1': '系统繁忙，请稍后重试'
  }

  return errorMap[errCode] || `检测失败（错误码：${errCode}）`
}

