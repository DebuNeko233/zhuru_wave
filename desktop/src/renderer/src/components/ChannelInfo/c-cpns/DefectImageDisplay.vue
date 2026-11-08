<template>
  <div class="defect-image-display">
    <div class="defect-header">
      <div class="title">缺陷图片</div>
      <span class="image-count">
        {{
          hasMoreImages
            ? `显示 ${displayedImages.length} / ${totalImages}`
            : `${totalImages} 张图片`
        }}
      </span>
    </div>

    <div v-if="totalImages === 0" class="no-images">
      <div class="no-images-icon">
        <svg
          t="1758198398140"
          class="icon"
          viewBox="0 0 1281 1024"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          p-id="6713"
          width="80"
          height="80"
        >
          <path
            d="M106.805737 997.298566a80.104302 80.104302 0 0 1-80.104303-80.104303V106.805737a80.104302 80.104302 0 0 1 80.104303-80.104303h1068.057366a80.104302 80.104302 0 0 1 80.104302 80.104303v825.074315a80.104302 80.104302 0 0 1-80.104302 65.418514z"
            fill="#9FDBAD"
            p-id="6714"
          ></path>
          <path
            d="M1174.863103 53.402868a53.402868 53.402868 0 0 1 53.402868 53.402869v822.404172a53.402868 53.402868 0 0 1-53.402868 41.387223H106.805737a53.402868 53.402868 0 0 1-53.402869-53.402869V106.805737a53.402868 53.402868 0 0 1 53.402869-53.402869h1068.057366m0-53.402868H106.805737a106.805737 106.805737 0 0 0-106.805737 106.805737v810.388526a106.805737 106.805737 0 0 0 106.805737 106.805737h1068.057366a106.805737 106.805737 0 0 0 106.805737-106.805737h-1.335072V106.805737a106.805737 106.805737 0 0 0-106.805737-106.805737z"
            fill="#5C2D51"
            p-id="6715"
          ></path>
          <path
            d="M299.056063 400.521512a99.863364 99.863364 0 0 1-100.931422-101.465449A100.931421 100.931421 0 1 1 299.056063 400.521512z"
            fill="#F05071"
            p-id="6716"
          ></path>
          <path
            d="M299.056063 223.491004a73.695958 73.695958 0 0 1 74.764015 74.497001A75.03103 75.03103 0 0 1 299.056063 373.820078a73.428944 73.428944 0 0 1-74.229987-74.764015 75.03103 75.03103 0 0 1 74.229987-75.565059m0-53.402868a128.166884 128.166884 0 1 0 128.166884 127.899869 128.166884 128.166884 0 0 0-128.166884-127.899869z"
            fill="#5C2D51"
            p-id="6717"
          ></path>
          <path
            d="M198.124641 827.744459v-93.45502l186.91004-186.910039 70.224771 69.957758a51.266754 51.266754 0 0 0 72.360887 0l305.731421-302.794264 252.328553 252.061539v260.605997z"
            fill="#FDCA89"
            p-id="6718"
          ></path>
          <path
            d="M833.35176 352.191917l224.559061 224.292046V801.043025H224.826076v-53.402869l160.208605-160.208605 51.266753 51.266754a77.968188 77.968188 0 0 0 110.276923 0l286.773403-286.506388m0-65.1515a24.565319 24.565319 0 0 0-17.355932 7.209387L509.196349 599.714211a24.565319 24.565319 0 0 1-34.711864 0l-71.559844-71.559843a24.565319 24.565319 0 0 0-34.711864 0l-189.847197 189.580182a23.230248 23.230248 0 0 0-6.942373 16.554889v95.591135a23.230248 23.230248 0 0 0 23.497262 24.565319h893.162973a23.230248 23.230248 0 0 0 23.230248-23.230248v-267.014341a23.230248 23.230248 0 0 0-6.942373-16.554889L850.707692 293.715776a24.565319 24.565319 0 0 0-17.355932-7.209387z"
            fill="#5C2D51"
            p-id="6719"
          ></path>
        </svg>
      </div>
      <p>暂无缺陷图片</p>
    </div>

    <div v-else class="defect-image-grid">
      <div
        v-for="(image, index) in displayedImages"
        :key="index"
        class="defect-image-item"
        @click="openPreview(index)"
      >
        <img
          :src="image.base64Src"
          :alt="`缺陷图片 ${index + 1}`"
          class="defect-image"
          @error="handleImageError(image.originalPath)"
        />
        <div class="defect-image-overlay">
          <span class="defect-image-name">{{ getImageName(image.originalPath) }}</span>
        </div>
      </div>

      <!-- 当有更多图片时显示提示 -->
      <div v-if="hasMoreImages" class="more-images-hint" @click="openPreview(0)">
        <div class="more-images-content">
          <div class="more-images-icon">+{{ totalImages - displayedImages.length }}</div>
          <span class="more-images-text">点击查看全部</span>
        </div>
      </div>
    </div>

    <teleport to="body">
      <el-image-viewer
        v-if="previewVisible"
        :url-list="previewUrlList"
        :initial-index="previewIndex"
        :hide-on-click-modal="false"
        @close="closePreview"
      />
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElImageViewer } from 'element-plus'

interface Props {
  imagePaths?: string[]
  maxImages?: number // 最大显示图片数量
}

interface ImageData {
  originalPath: string
  base64Src: string
}

const props = withDefaults(defineProps<Props>(), {
  imagePaths: () => [],
  maxImages: 7 // 默认最大显示5张图片
})

const validImages = ref<ImageData[]>([])
const previewVisible = ref(false)
const previewIndex = ref(0)

// 限制显示的图片数量
const displayedImages = computed(() => {
  return validImages.value.slice(0, props.maxImages)
})

// 总图片数量
const totalImages = computed(() => validImages.value.length)

// 是否有更多图片未显示
const hasMoreImages = computed(() => totalImages.value > props.maxImages)

// 为图片预览组件提供URL列表
const previewUrlList = computed(() => {
  return validImages.value.map((image) => image.base64Src)
})

// 加载图片为base64格式
const loadImages = async () => {
  if (!props.imagePaths || props.imagePaths.length === 0) {
    validImages.value = []
    return
  }

  const loadedImages: ImageData[] = []

  for (const imagePath of props.imagePaths) {
    try {
      const base64Src = await window.electronAPI.invoke('read-image', imagePath)
      if (base64Src) {
        loadedImages.push({
          originalPath: imagePath,
          base64Src
        })
      }
    } catch (error) {
      console.error('加载图片失败:', imagePath, error)
    }
  }

  validImages.value = loadedImages
}

// 监听图片路径变化
watch(() => props.imagePaths, loadImages, { immediate: true })

const getImageName = (path: string) => {
  return path.split(/[\\/]/).pop() || '未知图片'
}

const handleImageError = (imagePath: string) => {
  console.error('图片加载失败:', imagePath)
}

const openPreview = (index: number) => {
  previewIndex.value = index
  previewVisible.value = true
}

const closePreview = () => {
  previewVisible.value = false
}
</script>
<style scoped lang="less">
@import '@renderer/assets/mixins.less';

.defect-image-display {
  .card-style-hover();
  min-height: 360px;
  .defect-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    font-weight: 500;
    .image-count {
      color: #909399;
      font-size: 12px;
      background: #f5f7fa;
      padding: 4px 8px;
      border-radius: 4px;
    }
  }

  .defect-content {
    width: 100%;
  }

  .defect-image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    width: 100%;

    max-height: 360px; /* 设置最大高度 */
    min-height: 200px; /* 设置最小高度 */
    overflow-y: auto; /* 添加垂直滚动条 */
    padding-right: 5px; /* 为滚动条预留空间 */
    .defect-image-item {
      position: relative;
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid #e4e7ed;

      &:hover {
        border-color: #409eff;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);

        .defect-image-overlay {
          opacity: 1;
        }
      }

      .defect-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }

      .defect-image-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        opacity: 0;
        transition: opacity 0.3s ease;

        .defect-image-name {
          color: white;
          font-size: 12px;
          text-align: center;
          padding: 0 8px;
          word-break: break-word;
        }

        .preview-icon {
          color: white;
          font-size: 20px;
        }
      }
    }

    .more-images-hint {
      position: relative;
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px dashed #409eff;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        border-color: #337ecc;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
        background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
      }

      .more-images-content {
        text-align: center;
        color: #409eff;

        .more-images-icon {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .more-images-text {
          font-size: 10px;
          display: block;
        }
      }
    }
  }

  .no-images {
    text-align: center;
    padding: 40px 20px;
    color: #909399;

    .no-images-icon {
      font-size: 48px;
      color: #c0c4cc;
    }

    p {
      margin: 0;
      font-size: 14px;
    }
  }
}

.defect-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;

  .defect-preview-content {
    background-color: transparent;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative;

    .defect-close-btn {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.3);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 28px;
      cursor: pointer;
      color: white;
      z-index: 10;

      &:hover {
        background: rgba(0, 0, 0, 0.5);
      }
    }

    .defect-preview-img {
      max-width: 95vw;
      max-height: 85vh;
      object-fit: contain;
      display: block;
      margin: 0 auto;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    }

    .defect-preview-info {
      margin-top: 20px;
      text-align: center;

      h4 {
        margin: 0 0 8px 0;
        font-size: 18px;
        color: white;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
      }

      p {
        margin: 0;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);
      }
    }

    .defect-preview-controls {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-top: 20px;

      button {
        padding: 10px 20px;
        background-color: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        color: white;
        transition: all 0.2s;

        &:hover:not(:disabled) {
          background-color: rgba(255, 255, 255, 0.3);
        }

        &:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
      }
    }
  }
}

@media screen and (max-width: 1920px) {
  .defect-image-display {
    min-height: 200px;
    .defect-header {
      .title {
        font-size: 0.8rem;
      }
    }
    .defect-image-grid {
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
      .defect-image-item {
      }
    }
  }
}
</style>
