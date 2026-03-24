<template>
  <view class="container">
    <!-- 顶部标题 -->
    <view class="header">
      <text class="title">拼豆魔法工坊</text>
      <text class="subtitle">🎨把图片变成拼豆魔法</text>
    </view>

    <!-- 核心卡片区 -->
    <view class="main-card">
      <!-- 图片类型选择器 -->
      <view class="section">
        <view class="section-title">
          <text class="label">图片类型</text>
          <text class="badge">{{ imageType === 'standard' ? '标准图案' : '像素网格' }}</text>
        </view>

        <view class="type-selector">
          <view
            class="type-option"
            :class="{ 'type-option-active': imageType === 'standard' }"
            @tap="handleImageTypeSelect('standard')"
          >
            <text class="type-icon">🎨</text>
            <text class="type-text">标准图案</text>
            <text class="type-hint">适合大部分图片</text>
          </view>
          <view
            class="type-option"
            :class="{ 'type-option-active': imageType === 'pixel' }"
            @tap="handleImageTypeSelect('pixel')"
          >
            <text class="type-icon">🖼️</text>
            <text class="type-text">像素网格</text>
            <text class="type-hint">适合图纸标色号</text>
          </view>
        </view>
      </view>

      <!-- 品牌选择器 -->
      <view class="section">
        <view class="section-title">
          <text class="label">拼豆品牌</text>
          <text class="badge">{{ selectedBrandInfo?.displayName }}</text>
        </view>

        <scroll-view
          class="brand-chips"
          scroll-x
          show-scrollbar="false"
        >
          <view
            v-for="brand in brandList"
            :key="brand.key"
            class="chip"
            :class="{ 'chip-active': selectedBrand === brand.key }"
            @tap="handleBrandSelect(brand.key)"
          >
            <text class="chip-text">{{ brand.displayName }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 图片上传区 -->
      <view class="section">
        <view class="section-title">
          <text class="label">上传图片</text>
          <view v-if="imageType === 'pixel' && imagePath" class="pixel-reupload-btn" @tap="handleChooseImage">
            <text class="pixel-reupload-text">重新上传</text>
          </view>
        </view>

        <!-- 标准图案模式 -->
        <view v-if="imageType === 'standard'" class="upload-area" @tap="handleChooseImage">
          <image
            v-if="imagePath"
            :src="imagePath"
            class="preview-image"
            mode="aspectFit"
          />
          <view v-else class="upload-placeholder">
            <text class="upload-icon">+</text>
            <text class="upload-text">点击上传图片</text>
          </view>
        </view>

        <!-- 像素图片模式 -->
        <view v-else class="pixel-image-editor">
          <view v-if="!imagePath" class="upload-area" @tap="handleChooseImage">
            <view class="upload-placeholder">
              <text class="upload-icon">+</text>
              <text class="upload-text">点击上传图片</text>
            </view>
          </view>
          <view v-else class="pixel-editor-container">
            <view 
              class="pixel-editor-wrapper" 
              :style="{ height: pixelEditorContainerHeight + 'px' }"
              @touchstart.stop="handlePixelEditorTouchStart" 
              @touchmove.stop.prevent="handlePixelEditorTouchMove" 
              @touchend.stop="handlePixelEditorTouchEnd"
            >
              <view 
                class="pixel-image-container"
                :style="pixelImageStyle"
              >
                <image
                  :src="imagePath"
                  class="pixel-preview-image"
                  mode="widthFix"
                  :style="{ width: pixelImageWidth + 'px' }"
                />
              </view>
              
              <!-- 网格线 -->
              <view 
                v-for="(gridLine, index) in pixelGridLines"
                :key="'grid-' + index"
                class="pixel-grid-line"
                :style="gridLine.style"
              ></view>
            </view>
            
            <view class="pixel-editor-info">
              <text class="pixel-info-hint">调整网格比例和缩放移动图片，使网格与像素画色块严格对齐</text>
            </view>
          </view>
        </view>

        <!-- 图片检测提示 -->
        <view class="upload-hint">
          <text class="upload-hint-text">根据微信要求，上传图片需进行合规检测</text>
        </view>

        <!-- 网格比例滑动条（仅像素图片模式显示） -->
        <view v-if="imageType === 'pixel'" class="section pixel-grid-section">
          <view class="section-title">
            <text class="label">网格比例</text>
            <view class="section-value-input-container">
              <input
                type="digit"
                class="section-value-input"
                :value="sectionValueInput"
                @input="handleSectionValueInput"
                @blur="handleSectionValueBlur"
              />
              <text class="section-value-unit">%</text>
            </view>
          </view>

          <view class="slider-container">
            <slider
              :value="pixelBlockSizeRatio * 100"
              :min="1"
              :max="5"
              :step="0.01"
              activeColor="#6C5CE7"
              backgroundColor="#E5E5E5"
              block-size="24"
              @change="handlePixelBlockSizeRatioChange"
              @changing="handlePixelBlockSizeRatioChanging"
            />
            <view class="slider-labels">
              <text class="slider-label">1%</text>
              <text class="slider-label">5%</text>
            </view>
          </view>
          <view class="tip tip-secondary">
            <text class="tip-icon">💡</text>
            <text class="tip-text">{{ imageType === 'standard' ? '图片主体占比越大，效果越好哦' : '调整网格比例和缩放移动图片，使网格与像素画色块严格对齐' }}</text>
          </view>
        </view>
      </view>

      <!-- 尺寸设置（仅标准图案模式显示） -->
      <view v-if="imageType === 'standard'" class="section">
        <view class="section-title">
          <text class="label">拼豆板尺寸</text>
          <text class="value">{{ beadWidth }} 颗</text>
        </view>

        <view class="slider-container">
          <slider
            :value="beadWidth"
            :min="10"
            :max="100"
            :step="1"
            activeColor="#6C5CE7"
            backgroundColor="#E5E5E5"
            block-size="24"
            @change="handleSliderChange"
            @changing="handleSliderChanging"
          />
          <view class="slider-labels">
            <text class="slider-label">10</text>
            <text class="slider-label">100</text>
          </view>
        </view>
        <view class="tip tip-secondary">
          <text class="tip-icon">✨</text>
          <text class="tip-text">尺寸越大，图纸越精美哦～</text>
        </view>
      </view>

      <!-- 联系作者按钮 -->
      <view class="contact-section">
        <button
          class="contact-btn"
          open-type="contact"
        >
          <text class="contact-btn-text">💬 联系作者</text>
        </button>
      </view>
    </view>

    <!-- 底部生成按钮 -->
    <view class="footer">
      <button
        class="generate-btn"
        :class="{ 'generate-btn-disabled': !canGenerate }"
        :disabled="!canGenerate"
        @tap="handleGenerate"
      >
        <text class="btn-text">✨ 生成魔法图纸</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { BrandKey } from '@/types/index';
import { BRAND_LIST } from '@/utils/paletteData';
import { checkImage, compressImage, getSecurityErrorMessage, prepareWatchConnection } from '@/utils/securityCheck';

const brandList = BRAND_LIST;

const selectedBrand = ref<BrandKey>('mard');
const imagePath = ref('');
const beadWidth = ref(60);
const imageType = ref<'standard' | 'pixel'>('standard');

// 像素图片模式相关状态
const pixelEditorContainerHeight = ref(500); // px
const pixelEditorContainerWidth = ref(0); // px
const pixelBlockSizeRatio = ref(0.03); // 网格宽度相对于图片宽度的比例，范围0.01-0.05（1%-5%），支持两位小数，默认3%
const sectionValueInput = ref('3.00'); // 标题栏输入框的显示值
const pixelImageWidth = ref(0); // 图片显示宽度（px）
const pixelImageScale = ref(1); // 图片缩放比例
const pixelImageOffsetX = ref(0); // 图片X偏移（px）
const pixelImageOffsetY = ref(0); // 图片Y偏移（px）
const pixelImageInfo = ref<{ width: number; height: number } | null>(null);

// 拖拽状态
const isDraggingImage = ref(false);
const dragImageStartX = ref(0);
const dragImageStartY = ref(0);
const dragImageStartOffsetX = ref(0);
const dragImageStartOffsetY = ref(0);

const isPinching = ref(false);
const pinchStartDistance = ref(0);
const pinchStartScale = ref(1);

const selectedBrandInfo = computed(() => {
  return brandList.find(brand => brand.key === selectedBrand.value);
});

// 计算当前显示用的网格大小（根据图片显示尺寸和比例）
const pixelBlockSize = computed(() => {
  if (!pixelImageInfo.value) return 0;
  // 网格大小 = 图片显示宽度 * 缩放比例 * 比例值
  const displayImageWidth = pixelImageWidth.value * pixelImageScale.value;
  return displayImageWidth * pixelBlockSizeRatio.value;
});

// 计算网格线（以图片中心为基准）
const pixelGridLines = computed(() => {
  const blockSize = pixelBlockSize.value;
  if (blockSize < 0.1 || !pixelImageInfo.value) return []; // 最小间距检查（允许小数）
  
  const containerWidth = pixelEditorContainerWidth.value || 500;
  const containerHeight = pixelEditorContainerHeight.value;
  const lines: Array<{ style: any }> = [];
  
  // 计算图片在容器中的实际位置和尺寸
  const displayImageWidth = pixelImageWidth.value * pixelImageScale.value;
  const displayImageHeight = (displayImageWidth / pixelImageInfo.value.width) * pixelImageInfo.value.height;
  const imageLeft = (containerWidth - displayImageWidth) / 2 + pixelImageOffsetX.value;
  const imageTop = (containerHeight - displayImageHeight) / 2 + pixelImageOffsetY.value;
  const imageCenterX = imageLeft + displayImageWidth / 2;
  const imageCenterY = imageTop + displayImageHeight / 2;
  
  // 计算网格原点（图片中心对齐到网格中心）
  // 使用更精确的计算方式，避免浮点数取模的精度问题
  // 当 blockSize 很小时，使用更精确的计算方法
  const gridOriginX = blockSize > 0 ? imageCenterX - (imageCenterX % blockSize) : imageCenterX;
  const gridOriginY = blockSize > 0 ? imageCenterY - (imageCenterY % blockSize) : imageCenterY;
  
  // 确保原点计算精确（处理浮点数精度问题，精确到两位小数）
  const normalizedOriginX = Math.round(gridOriginX * 100) / 100;
  const normalizedOriginY = Math.round(gridOriginY * 100) / 100;
  
  // 绘制垂直线（从网格原点向两边扩展）
  // 使用更精确的计算，避免浮点数累积误差
  const minGridX = -Math.ceil(containerWidth / blockSize) - 1;
  const maxGridX = Math.ceil(containerWidth / blockSize) + 2;
  for (let i = minGridX; i <= maxGridX; i++) {
    // 直接计算每条线的位置，避免累积误差
    const lineX = normalizedOriginX + Math.round(i * blockSize * 100) / 100;
    const roundedLineX = Math.round(lineX * 100) / 100; // 精确到两位小数
    if (roundedLineX >= -2 && roundedLineX <= containerWidth + 2) {
      lines.push({
        style: {
          position: 'absolute',
          left: roundedLineX + 'px',
          top: '0px',
          width: '1px',
          height: containerHeight + 'px',
          backgroundColor: '#FF4D4F',
          opacity: 0.6,
          zIndex: 4,
          pointerEvents: 'none'
        }
      });
    }
  }
  
  // 绘制水平线（从网格原点向上下扩展）
  // 使用更精确的计算，避免浮点数累积误差
  const minGridY = -Math.ceil(containerHeight / blockSize) - 1;
  const maxGridY = Math.ceil(containerHeight / blockSize) + 2;
  
  for (let i = minGridY; i <= maxGridY; i++) {
    // 直接计算每条线的位置，避免累积误差
    const lineY = normalizedOriginY + Math.round(i * blockSize * 100) / 100;
    const roundedLineY = Math.round(lineY * 100) / 100; // 精确到两位小数
    if (roundedLineY >= -2 && roundedLineY <= containerHeight + 2) {
      lines.push({
        style: {
          position: 'absolute',
          left: '0px',
          top: roundedLineY + 'px',
          width: containerWidth + 'px',
          height: '1px',
          backgroundColor: '#FF4D4F',
          opacity: 0.6,
          zIndex: 4,
          pointerEvents: 'none'
        }
      });
    }
  }
  
  return lines;
});

const pixelImageStyle = computed(() => {
  // CSS 中 top: 50%, left: 50% 将容器左上角定位到父容器中心
  // 需要先用 translate(-50%, -50%) 将容器自身居中（相对于容器自身尺寸）
  // 然后再叠加用户拖拽的偏移和缩放
  // 注意：translate(-50%, -50%) 中的百分比是相对于元素自身的宽高
  // 由于容器内只有图片，容器大小就是图片的原始显示大小（未缩放前）
  
  // 计算图片的原始显示尺寸（未缩放）
  const originalImageWidth = pixelImageWidth.value;
  const originalImageHeight = pixelImageInfo.value 
    ? (originalImageWidth / pixelImageInfo.value.width) * pixelImageInfo.value.height
    : 0;
  
  // 计算居中偏移（负的原始图片尺寸的一半）
  // 这是 translate(-50%, -50%) 的等效像素值
  const centerOffsetX = -originalImageWidth / 2;
  const centerOffsetY = -originalImageHeight / 2;
  
  // 组合 transform：先居中（相对于原始尺寸），再叠加用户拖拽偏移，最后缩放
  // 缩放会以 transformOrigin (center center) 为中心进行
  const translateX = centerOffsetX + pixelImageOffsetX.value;
  const translateY = centerOffsetY + pixelImageOffsetY.value;
  const scale = pixelImageScale.value;
  
  return {
    transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
    transformOrigin: 'center center'
  };
});

const canGenerate = computed(() => {
  if (!imagePath.value) return false;
  if (imageType.value === 'standard') {
    return beadWidth.value >= 10 && beadWidth.value <= 100;
  } else {
    // 像素图片模式：需要图片已上传且比例有效
    return pixelBlockSizeRatio.value >= 0.01 && pixelBlockSizeRatio.value <= 0.1;
  }
});

const handleBrandSelect = (brandKey: BrandKey) => {
  selectedBrand.value = brandKey;
  if (typeof uni.vibrateShort === 'function') {
    uni.vibrateShort({
      type: 'light'
    });
  }
};

const handleImageTypeSelect = (type: 'standard' | 'pixel') => {
  imageType.value = type;
  if (typeof uni.vibrateShort === 'function') {
    uni.vibrateShort({
      type: 'light'
    });
  }
  
  // 切换到像素图片模式时，初始化图片信息
  if (type === 'pixel' && imagePath.value) {
    nextTick(() => {
      initPixelImageInfo();
    });
  }
};

const handleChooseImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempPath = res.tempFilePaths[0];
      console.log('[securityCheck] chooseImage success, path=', tempPath);

      try {
        const totalStartTime = Date.now();
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
        
        console.log(`[securityCheck] [${formatTimestamp()}] ========== 图片检测流程开始 ==========`);
        
        uni.showLoading({ title: '正在压缩图片...', mask: true });

        // 压缩到约100KB，减少上传与检测耗时
        const compressStartTime = Date.now();
        console.log(`[securityCheck] [${formatTimestamp()}] 开始压缩图片...`);
        const compressedPath = await compressImage(tempPath);
        const compressTime = Date.now() - compressStartTime;
        console.log(`[securityCheck] [${formatTimestamp()}] 图片压缩完成，耗时: ${compressTime} ms`);
        console.log('[securityCheck] compressedPath=', compressedPath);

        // 更新加载提示
        uni.showLoading({ title: '正在上传图片...', mask: true });

        // 调用云函数进行内容安全检测（会自动等待异步结果）
        const checkStartTime = Date.now();
        console.log(`[securityCheck] [${formatTimestamp()}] 开始图片安全检测...`);
        
        // 在 checkImage 内部更新提示
        const checkResult = await checkImage(compressedPath, 1);
        const checkTime = Date.now() - checkStartTime;
        console.log(`[securityCheck] [${formatTimestamp()}] 图片安全检测完成，耗时: ${checkTime} ms`);
        console.log('[securityCheck] checkImage result=', checkResult);

        const totalTime = Date.now() - totalStartTime;
        console.log(`[securityCheck] [${formatTimestamp()}] ========== 图片检测流程结束 ==========`);
        console.log(`[securityCheck] [${formatTimestamp()}] 总耗时: ${totalTime} ms`);
        console.log(`[securityCheck] [${formatTimestamp()}] 压缩耗时: ${compressTime} ms (${((compressTime / totalTime) * 100).toFixed(1)}%)`);
        console.log(`[securityCheck] [${formatTimestamp()}] 检测耗时: ${checkTime} ms (${((checkTime / totalTime) * 100).toFixed(1)}%)`);

        uni.hideLoading();

        if (!checkResult?.success) {
          const msg = getSecurityErrorMessage(checkResult?.errCode ?? -1);
          if (checkResult?.errCode === 87014) {
            uni.showModal({
              title: '违规提示',
              content: msg,
              showCancel: false
            });
          } else {
            uni.showToast({
              title: msg,
              icon: 'none'
            });
          }
          return; // 阻断后续逻辑
        }

        // 检测通过，保存路径并继续
        imagePath.value = compressedPath;
        if (typeof uni.vibrateShort === 'function') {
          uni.vibrateShort({
            type: 'medium'
          });
        }
        
        // 如果是像素图片模式，初始化图片信息
        if (imageType.value === 'pixel') {
          nextTick(() => {
            initPixelImageInfo();
          });
        }
      } catch (err: any) {
        uni.hideLoading();
        console.error('[securityCheck] chooseImage error:', err);
        uni.showToast({
          title: err?.message || '检测失败，请重试',
          icon: 'none'
        });
      }
    },
    fail: (err) => {
      console.error('选择图片失败:', err);
      uni.showToast({
        title: '选择图片失败',
        icon: 'none'
      });
    }
  });
};

// 初始化像素图片信息
const initPixelImageInfo = () => {
  if (!imagePath.value) return;
  
  uni.getImageInfo({
    src: imagePath.value,
    success: (res) => {
      pixelImageInfo.value = { width: res.width, height: res.height };
      
      // 计算容器高度和宽度（rpx转px）
      const systemInfo = uni.getSystemInfoSync();
      const rpxToPx = systemInfo.windowWidth / 750;
      pixelEditorContainerHeight.value = 500 * rpxToPx;
      
      // 初始化图片显示宽度（适应容器）
      const containerWidth = systemInfo.windowWidth - 64 * rpxToPx; // 减去padding
      pixelEditorContainerWidth.value = containerWidth;
      pixelImageWidth.value = Math.min(containerWidth, res.width);
      
      // 重置图片位置和缩放
      pixelImageOffsetX.value = 0;
      pixelImageOffsetY.value = 0;
      pixelImageScale.value = 1;
    },
    fail: (err) => {
      console.error('获取图片信息失败:', err);
    }
  });
};

// 红线相关代码已移除

// 图片拖拽和缩放处理
const handlePixelEditorTouchStart = (e: any) => {
  e.stopPropagation(); // 阻止事件冒泡，防止影响页面滚动
  const touches = e.touches || [];
  
  if (touches.length === 1) {
    // 单指拖拽
    isDraggingImage.value = true;
    const touch = touches[0];
    dragImageStartX.value = touch.clientX || touch.x;
    dragImageStartY.value = touch.clientY || touch.y;
    dragImageStartOffsetX.value = pixelImageOffsetX.value;
    dragImageStartOffsetY.value = pixelImageOffsetY.value;
  } else if (touches.length === 2) {
    // 双指缩放
    isPinching.value = true;
    const touch1 = touches[0];
    const touch2 = touches[1];
    const distance = Math.sqrt(
      Math.pow((touch2.clientX || touch2.x) - (touch1.clientX || touch1.x), 2) +
      Math.pow((touch2.clientY || touch2.y) - (touch1.clientY || touch1.y), 2)
    );
    pinchStartDistance.value = distance;
    pinchStartScale.value = pixelImageScale.value;
  }
};

const handlePixelEditorTouchMove = (e: any) => {
  e.preventDefault(); // 阻止默认行为，防止页面滚动
  e.stopPropagation(); // 阻止事件冒泡
  const touches = e.touches || [];
  
  if (isPinching.value && touches.length === 2) {
    // 双指缩放
    const touch1 = touches[0];
    const touch2 = touches[1];
    const distance = Math.sqrt(
      Math.pow((touch2.clientX || touch2.x) - (touch1.clientX || touch1.x), 2) +
      Math.pow((touch2.clientY || touch2.y) - (touch1.clientY || touch1.y), 2)
    );
    const scale = (distance / pinchStartDistance.value) * pinchStartScale.value;
    pixelImageScale.value = Math.max(0.5, Math.min(10, scale)); // 最大放大到10倍，便于精确匹配网格
  } else if (isDraggingImage.value && touches.length === 1) {
    // 单指拖拽
    const touch = touches[0];
    const deltaX = (touch.clientX || touch.x) - dragImageStartX.value;
    const deltaY = (touch.clientY || touch.y) - dragImageStartY.value;
    pixelImageOffsetX.value = dragImageStartOffsetX.value + deltaX;
    pixelImageOffsetY.value = dragImageStartOffsetY.value + deltaY;
  }
};

const handlePixelEditorTouchEnd = (e: any) => {
  e.stopPropagation(); // 阻止事件冒泡
  isDraggingImage.value = false;
  isPinching.value = false;
};

const handleSliderChange = (e: any) => {
  beadWidth.value = e.detail.value;
};

const handleSliderChanging = (e: any) => {
  beadWidth.value = e.detail.value;
};

// 像素图片模式：网格比例滑动条处理
const handlePixelBlockSizeRatioChange = (e: any) => {
  const newRatio = Math.max(0.01, Math.min(0.05, e.detail.value / 100));
  updatePixelBlockSizeRatio(newRatio);
};

const handlePixelBlockSizeRatioChanging = (e: any) => {
  const newRatio = Math.max(0.01, Math.min(0.05, e.detail.value / 100));
  updatePixelBlockSizeRatio(newRatio);
};

// 精确值输入框功能已删除

// 更新网格比例
const updatePixelBlockSizeRatio = (newRatio: number) => {
  pixelBlockSizeRatio.value = newRatio;
  // 同步更新输入框显示值
  const displayValue = (newRatio * 100).toFixed(2);
  sectionValueInput.value = displayValue;
  // 网格会自动通过 computed 更新，无需手动更新红线位置
};

// 网格比例标题栏输入框处理（限制只能输入两位小数）
const handleSectionValueInput = (e: any) => {
  let inputValue = e.detail?.value || e.target?.value || '';
  
  // 限制只能输入数字和一个小数点，最多两位小数
  inputValue = inputValue.replace(/[^\d.]/g, ''); // 移除非数字和小数点的字符
  // 限制只能有一个小数点
  const parts = inputValue.split('.');
  if (parts.length > 2) {
    inputValue = parts[0] + '.' + parts.slice(1).join('');
  }
  // 限制小数部分最多两位
  if (parts.length === 2 && parts[1].length > 2) {
    inputValue = parts[0] + '.' + parts[1].substring(0, 2);
  }
  
  // 更新输入框显示值
  sectionValueInput.value = inputValue;
  
  const numValue = parseFloat(inputValue);
  if (!isNaN(numValue) && numValue >= 1 && numValue <= 5) {
    const newRatio = numValue / 100; // 直接转换，不四舍五入
    pixelBlockSizeRatio.value = newRatio;
    // 输入框已同步更新
  }
};

// 网格比例标题栏输入框失焦处理
const handleSectionValueBlur = (e: any) => {
  let inputValue = sectionValueInput.value;
  const numValue = parseFloat(inputValue);
  
  if (isNaN(numValue) || numValue < 1) {
    updatePixelBlockSizeRatio(0.01);
  } else if (numValue > 5) {
    updatePixelBlockSizeRatio(0.05);
  } else {
    // 确保格式化为两位小数，但不改变实际值
    const formattedValue = numValue.toFixed(2);
    const newRatio = numValue / 100; // 直接转换，不四舍五入
    pixelBlockSizeRatio.value = newRatio;
    sectionValueInput.value = formattedValue;
  }
};

const handleGenerate = () => {
  if (!canGenerate.value) {
    uni.showToast({
      title: '请先上传图片',
      icon: 'none'
    });
    return;
  }

  if (typeof uni.vibrateShort === 'function') {
    uni.vibrateShort({
      type: 'heavy'
    });
  }

  let url = `/pages/editor/editor?brand=${selectedBrand.value}&image=${encodeURIComponent(imagePath.value)}&type=${imageType.value}`;
  
  if (imageType.value === 'standard') {
    url += `&width=${beadWidth.value}`;
  } else {
    // 像素图片模式：传递网格比例、图片偏移和缩放
    // 网格中心位置通过图片中心计算，不需要单独传递
    url += `&pixelBlockSizeRatio=${pixelBlockSizeRatio.value}`;
    url += `&pixelOffsetX=${pixelImageOffsetX.value}`;
    url += `&pixelOffsetY=${pixelImageOffsetY.value}`;
    url += `&pixelScale=${pixelImageScale.value}`;
    if (pixelImageInfo.value) {
      url += `&pixelImageWidth=${pixelImageInfo.value.width}`;
      url += `&pixelImageHeight=${pixelImageInfo.value.height}`;
    }
    
    console.log('传递像素图片参数:', {
      pixelBlockSizeRatio: pixelBlockSizeRatio.value,
      pixelOffsetX: pixelImageOffsetX.value,
      pixelOffsetY: pixelImageOffsetY.value,
      pixelScale: pixelImageScale.value
    });
  }

  uni.navigateTo({ url });
};

onMounted(() => {
  // 初始化容器高度和宽度
  const systemInfo = uni.getSystemInfoSync();
  const rpxToPx = systemInfo.windowWidth / 750;
  pixelEditorContainerHeight.value = 500 * rpxToPx;
  pixelEditorContainerWidth.value = systemInfo.windowWidth - 64 * rpxToPx; // 减去padding
  // 初始化网格比例
  pixelBlockSizeRatio.value = 0.03; // 默认3%
  sectionValueInput.value = '3.00';

  // 预热数据库监听，减少检测时的建链耗时
  // 如果 App.vue 中已经预热过，这里会直接返回（不会重复建立）
  prepareWatchConnection().catch((e) => {
    console.warn('[securityCheck] prepareWatchConnection 失败：', e);
  });
});

// 页面显示时也检查并预热连接（如果超过 5 分钟未预热，重新预热以保持连接活跃）
onShow(() => {
  // #ifdef MP-WEIXIN
  prepareWatchConnection().catch((e) => {
    console.warn('[securityCheck] onShow prepareWatchConnection 失败：', e);
  });
  // #endif
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #F8F9FA;
  padding: 32rpx;
  padding-bottom: 160rpx;
}

.header {
  text-align: center;
  margin-bottom: 48rpx;
  padding-top: 20rpx;
}

.title {
  display: block;
  font-size: 56rpx;
  font-weight: 700;
  color: #2D3436;
  margin-bottom: 16rpx;
  letter-spacing: 2rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: #636E72;
  font-weight: 400;
}

.main-card {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}

.section {
  margin-bottom: 56rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.pixel-grid-section {
  margin-top: 56rpx; // 与上传图片区域保持相同距离
}

.pixel-grid-section {
  margin-top: 56rpx; // 与上传图片区域保持相同距离
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.label {
  font-size: 32rpx;
  font-weight: 600;
  color: #2D3436;
}

.badge {
  font-size: 24rpx;
  color: #6C5CE7;
  background-color: #F0EEFF;
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  font-weight: 500;
}

.value {
  font-size: 32rpx;
  font-weight: 700;
  color: #6C5CE7;
}

.section-value-input-container {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.section-value-input {
  width: 120rpx;
  height: 56rpx;
  padding: 0 16rpx;
  background-color: #F8F9FA;
  border: 2rpx solid #E5E5E5;
  border-radius: 8rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #6C5CE7;
  text-align: center;
}

.section-value-input:focus {
  border-color: #6C5CE7;
  background-color: #FFFFFF;
}

.section-value-unit {
  font-size: 32rpx;
  font-weight: 700;
  color: #6C5CE7;
}

.type-selector {
  display: flex;
  gap: 16rpx;
}

.type-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24rpx 20rpx;
  border-radius: 16rpx;
  background-color: #F5F5F5;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
}

.type-option-active {
  background-color: #6C5CE7;
  border-color: #6C5CE7;
  box-shadow: 0 4rpx 16rpx rgba(108, 92, 231, 0.3);
  transform: scale(1.02);
}

.type-icon {
  font-size: 40rpx;
  margin-bottom: 8rpx;
}

.type-text {
  font-size: 28rpx;
  color: #636E72;
  font-weight: 500;
}

.type-option-active .type-text {
  color: #FFFFFF;
  font-weight: 600;
}

.type-hint {
  font-size: 22rpx;
  color: #95A5A6;
  margin-top: 4rpx;
  font-weight: 400;
}

.type-option-active .type-hint {
  color: rgba(255, 255, 255, 0.8);
}

.brand-chips {
  white-space: nowrap;
  display: flex;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 32rpx;
  margin-right: 16rpx;
  border-radius: 48rpx;
  background-color: #F5F5F5;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
}

.chip-active {
  background-color: #6C5CE7;
  border-color: #6C5CE7;
  box-shadow: 0 4rpx 16rpx rgba(108, 92, 231, 0.3);
  transform: scale(1.05);
}

.chip-text {
  font-size: 28rpx;
  color: #636E72;
  font-weight: 500;
}

.chip-active .chip-text {
  color: #FFFFFF;
  font-weight: 600;
}

.upload-area {
  width: 100%;
  height: 400rpx;
  border-radius: 16rpx;
  border: 3rpx dashed #DFE6E9;
  background-color: #FAFBFC;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all 0.3s ease;

  &:active {
    background-color: #F0F3F5;
    border-color: #6C5CE7;
  }
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  font-size: 80rpx;
  color: #B2BEC3;
  margin-bottom: 16rpx;
  font-weight: 300;
}

.upload-text {
  font-size: 28rpx;
  color: #636E72;
}

.upload-hint {
  margin-top: 16rpx;
  padding: 0 8rpx;
}

.upload-hint-text {
  font-size: 24rpx;
  color: #95A5A6;
  line-height: 1.5;
}

.preview-image {
  width: 100%;
  height: 100%;
}

/* 像素图片编辑器样式 */
.pixel-image-editor {
  width: 100%;
}

.pixel-editor-container {
  position: relative;
  width: 100%;
  border-radius: 16rpx;
  overflow: hidden;
  background-color: #F0F4F5;
}

.pixel-reupload-btn {
  padding: 8rpx 20rpx;
  background-color: rgba(108, 92, 231, 0.9);
  border-radius: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(108, 92, 231, 0.3);
}

.pixel-reupload-text {
  font-size: 24rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.pixel-editor-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  background-color: #F0F4F5;
}

.pixel-image-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center center;
  will-change: transform;
}

.pixel-preview-image {
  display: block;
  max-width: none;
}

.pixel-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #FF4D4F;
  z-index: 10;
  cursor: move;
}

.pixel-line-horizontal {
  width: 100%;
}

.pixel-grid-line {
  pointer-events: none;
}

.pixel-editor-info {
  padding: 24rpx;
  background-color: #FFFFFF;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.pixel-info-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #6C5CE7;
}

.pixel-info-hint {
  font-size: 24rpx;
  color: #B2BEC3;
}

.tip {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  background-color: #FFF9E6;
  border-radius: 12rpx;
}

.tip-secondary {
  background-color: #F2EEFF;
  margin-top: 16rpx;
}

.tip-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #F39C12;
  font-weight: 500;
}

.slider-container {
  padding: 0 8rpx;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 12rpx;
}

.slider-label {
  font-size: 24rpx;
  color: #B2BEC3;
}

.pixel-input-container {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  padding: 0 8rpx;
}

.pixel-input-label {
  font-size: 28rpx;
  color: #2D3436;
  margin-right: 16rpx;
}

.pixel-input {
  flex: 1;
  height: 64rpx;
  padding: 0 24rpx;
  background-color: #F8F9FA;
  border: 2rpx solid #E5E5E5;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #2D3436;
  text-align: center;
}

.pixel-input:focus {
  border-color: #6C5CE7;
  background-color: #FFFFFF;
}

.pixel-input-unit {
  font-size: 28rpx;
  color: #2D3436;
  margin-left: 12rpx;
}

.contact-section {
  margin-top: 48rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid #E5E5E5;
  display: flex;
  justify-content: center;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32rpx;
  background: linear-gradient(to top, #FFFFFF 80%, transparent);
}

.generate-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #A29BFE 0%, #6C5CE7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(108, 92, 231, 0.4);
  transition: all 0.3s ease;

  &::after {
    border: none;
  }
}

.generate-btn:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 16rpx rgba(108, 92, 231, 0.3);
}

.generate-btn-disabled {
  background: linear-gradient(135deg, #DFE6E9 0%, #B2BEC3 100%);
  box-shadow: none;
  opacity: 0.6;
}

.btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}

.contact-btn {
  width: auto;
  min-width: 240rpx;
  height: 72rpx;
  padding: 0 32rpx;
  border-radius: 36rpx;
  background-color: #FFFFFF;
  border: 2rpx solid #6C5CE7;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(108, 92, 231, 0.15);
  transition: all 0.3s ease;

  &::after {
    border: none;
  }
}

.contact-btn:active {
  transform: scale(0.96);
  background-color: #F0EEFF;
  box-shadow: 0 1rpx 4rpx rgba(108, 92, 231, 0.2);
}

.contact-btn-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #6C5CE7;
  letter-spacing: 1rpx;
}
</style>
