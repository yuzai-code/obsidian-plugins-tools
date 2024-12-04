<template>
  <div class="dashboard-container">
    <!-- 仪表盘头部 -->
    <div class="dashboard-header">
      <!-- <h2>发布仪表盘</h2> -->
      <!-- 搜索框 -->
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="搜索笔记..."
          class="search-input"
        />
      </div>
    </div>

    <!-- 批量操作区域 -->
    <div class="batch-publish-section" v-if="selectedNotes.size > 0">
      <span>已选择 {{ selectedNotes.size }} 个笔记</span>
      <button class="batch-publish-button" @click="handleBatchPublish">
        批量发布
      </button>
    </div>

    <!-- 标签页切换 -->
    <div class="tab-group">
      <div
        class="tab-item"
        :class="{ active: currentTab === 'all' }"
        @click="switchTab('all')"
      >
        全部笔记
      </div>
      <div
        class="tab-item"
        :class="{ active: currentTab === 'published' }"
        @click="switchTab('published')"
      >
        已发布笔记
      </div>
    </div>

    <!-- 笔列表 -->
    <div class="notes-list">
      <template v-if="filteredNotes.length">
        <div v-for="note in paginatedNotes" :key="note.filePath" class="note-item">
          <div class="note-title-bar" 
               @click="toggleNoteDetails(note.filePath)"
               :class="{ collapsed: !isNoteExpanded(note.filePath) }">
            <input
              type="checkbox"
              class="note-checkbox"
              v-model="selectedNotes"
              :value="note.filePath"
              @click.stop
            />
            <span class="note-title">{{ getFileName(note.filePath) }}</span>
            <div class="platform-badges">
              <span
                v-if="note.platform === 'github'"
                class="platform-badge github"
              >
                GitHub
              </span>
            </div>
          </div>

          <div
            class="note-details"
            :class="{ hidden: !isNoteExpanded(note.filePath) }"
          >
            <div class="platforms-list">
              <div class="platform-info">
                <div class="platform-header">
                  <span class="platform-name" :class="note.platform">
                    {{ getPlatformName(note.platform) }}
                  </span>
                  <div class="platform-actions">
                    <button
                      class="action-button"
                      @click="handleRepublish(note.filePath, note.platform)"
                    >
                      重新发布
                    </button>
                    <button
                      v-if="note.status === 'success'"
                      class="action-button"
                      @click="handleUpdateFromRemote(note.filePath, note.platform)"
                    >
                      从远程更新
                    </button>
                    <button
                      v-if="note.status === 'success'"
                      class="action-button"
                      @click="handleDeleteFromRemote(note.filePath, note.platform)"
                    >
                      从远程删除
                    </button>
                  </div>
                </div>
                <div class="publish-time" v-if="note.lastPublished">
                  最后发布时间：{{ formatDate(note.lastPublished) }}
                </div>
                <div class="remote-path" v-if="note.remotePath">
                  远程路径：{{ note.remotePath }}
                </div>
                <div class="status" v-if="note.status === 'unpublished'">
                  状态：未发布
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="empty-state">
        <span>{{ getEmptyStateMessage() }}</span>
        <button 
          v-if="currentTab === 'published'" 
          class="action-button switch-tab-button"
          @click="switchTab('all')"
        >
          切换到全部笔记
        </button>
      </div>

      <!-- 分页控件移到这里，只要有笔记就显示分页 -->
      <div class="pagination" v-if="filteredNotes.length > pageSize">
        <button 
          class="page-button" 
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          上一页
        </button>
        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        <button 
          class="page-button" 
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import type { PublishRecord } from '../models/publish-record.interface';
import type { TFile } from 'obsidian';
import { setIcon } from 'obsidian';

interface NoteRecord extends Omit<PublishRecord, 'status'> {
  status: 'success' | 'failed' | 'unpublished';
}

// Props 定义
const props = defineProps<{
  notes: PublishRecord[];
  onRepublish: (filePath: string, platform?: string) => Promise<void>;
  onUpdateFromRemote: (filePath: string, platform: string) => Promise<void>;
  onDeleteFromRemote: (filePath: string, platform: string) => Promise<void>;
}>();

// 状态
const currentTab = ref<'published' | 'all'>('all');
const selectedNotes = ref<Set<string>>(new Set());
const expandedNotes = ref<Set<string>>(new Set());
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = 10;

// 存储所有折叠图标的引用
const toggleIcons = ref<(HTMLElement | null)[]>([]);

// 设置图标引用的方法
const setToggleIconRef = (el: HTMLElement, index: number) => {
  toggleIcons.value[index] = el;
  // 修改图标方向：展开时用 chevron-down，折叠时用 chevron-right
  const isExpanded = isNoteExpanded(paginatedNotes.value[index].filePath);
  setIcon(el, isExpanded ? 'chevron-down' : 'chevron-right');
};

// 更新所有图标
const updateAllIcons = () => {
  nextTick(() => {
    toggleIcons.value.forEach((el, index) => {
      if (el && paginatedNotes.value[index]) {
        setIcon(el, isNoteExpanded(paginatedNotes.value[index].filePath) ? 'chevron-down' : 'chevron-right');
      }
    });
  });
};

onMounted(() => {
  // 在下一个 tick 设置图标，确保 DOM 已更新
  setTimeout(() => {
    toggleIcons.value.forEach(el => {
      setIcon(el, 'chevron-right');
    });
  }, 0);
});

// 切换标签页
const switchTab = (tab: 'published' | 'all') => {
  currentTab.value = tab;
  currentPage.value = 1;
  selectedNotes.value.clear();
};

// 获取空状态消息
const getEmptyStateMessage = () => {
  if (searchQuery.value) {
    return '没有找到匹配的笔记';
  }
  return currentTab.value === 'published' ? '还没有发布过任何笔记' : '没有笔记';
};

// 根据当前标签页和搜索条件过滤笔记列表
const filteredNotes = computed(() => {
  const allNotes = props.notes;
  let notes: NoteRecord[] = [];

  if (currentTab.value === 'published') {
    notes = allNotes.filter(note => note.status === 'success') as NoteRecord[];
  } else {
    const app = (window as any).app;
    const allFiles = app.vault.getMarkdownFiles() as TFile[];
    notes = allFiles.map(file => {
      const publishedNote = allNotes.find(note => note.filePath === file.path);
      return {
        filePath: file.path,
        status: publishedNote?.status || 'unpublished',
        platform: 'github',
        lastPublished: publishedNote?.lastPublished || 0,
        remotePath: publishedNote?.remotePath || ''
      };
    });
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    notes = notes.filter(note => 
      note.filePath.toLowerCase().includes(query) ||
      note.remotePath.toLowerCase().includes(query)
    );
  }

  return notes;
});

// 计算总页数
const totalPages = computed(() => 
  Math.max(1, Math.ceil(filteredNotes.value.length / pageSize))
);

// 获取当前页的笔记
const paginatedNotes = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  // 确保不会超出数组范围
  return filteredNotes.value.slice(start, Math.min(end, filteredNotes.value.length));
});

// 监听搜索和标签切换，重置分页
watch([searchQuery, currentTab], () => {
  currentPage.value = 1;
});

// 监听总页数变化，确保当前页不会超出范围
watch(totalPages, (newTotalPages) => {
  if (currentPage.value > newTotalPages) {
    currentPage.value = Math.max(1, newTotalPages);
  }
});

// 工具方法：从文件路径中提取文件名
const getFileName = (filePath: string) => {
  return filePath.split('/').pop() || filePath;
};

// 工具方法：获取平台显示名称
const getPlatformName = (platform: string) => {
  const platformMap: Record<string, string> = {
    github: 'GitHub',
  };
  return platformMap[platform] || platform;
};

// 工具方法：格式化时间戳为本地时间字符串
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

// 切换笔记详情的展开/收起状态
const toggleNoteDetails = (filePath: string) => {
  if (expandedNotes.value.has(filePath)) {
    expandedNotes.value.delete(filePath);
  } else {
    expandedNotes.value.add(filePath);
  }
  updateAllIcons();
};

// 检查笔记是否处于展开状态
const isNoteExpanded = (filePath: string) => {
  return expandedNotes.value.has(filePath);
};

// 处理单个笔记重新发布
const handleRepublish = async (filePath: string, platform?: string) => {
  await props.onRepublish(filePath, platform);
};

// 处理从远程更新笔记
const handleUpdateFromRemote = async (filePath: string, platform: string) => {
  await props.onUpdateFromRemote(filePath, platform);
};

// 处理从远程删除笔记
const handleDeleteFromRemote = async (filePath: string, platform: string) => {
  await props.onDeleteFromRemote(filePath, platform);
};

// 处理批量发布中的笔记
const handleBatchPublish = async () => {
  // 遍历所有选中的笔记进行发布
  for (const filePath of selectedNotes.value) {
    await props.onRepublish(filePath);
  }
  // 发布完成后清空选中状态
  selectedNotes.value.clear();
};

// 监听分页、标签切换和搜索变化，更新图标
watch([currentPage, currentTab, searchQuery], () => {
  toggleIcons.value = [];
  nextTick(updateAllIcons);
});

// 监听笔记数据变化，更新图标
watch(() => paginatedNotes.value, () => {
  toggleIcons.value = [];
  nextTick(updateAllIcons);
}, { deep: true });
</script>

<style>
/* 整体容器 */
.dashboard-container {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background-color: var(--background-primary);
  padding: 0 20px;
}

/* 头部样式 */
.dashboard-header {
  padding: 20px 0;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  position: relative;
}

.dashboard-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: -20px;
  right: -20px;
  height: 1px;
  background: var(--background-modifier-border);
}

.dashboard-header h2 {
  margin: 0;
  font-size: 1.6em;
  color: var(--text-normal);
  font-weight: 500;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
}

/* 搜索框 */
.search-box {
  position: relative;
  margin-bottom: 8px;
}

.search-input {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  background-color: var(--background-primary);
  color: var(--text-normal);
  font-size: 0.95em;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--interactive-accent);
  box-shadow: 0 0 0 2px var(--interactive-accent-hover);
}

/* 批量操作区域 */
.batch-publish-section {
  padding: 12px 16px;
  margin-bottom: 20px;
  background: var(--background-modifier-hover);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95em;
}

.batch-publish-button {
  background: var(--interactive-accent);
  color: var(--text-on-accent);
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.batch-publish-button:hover {
  background: var(--interactive-accent-hover);
}

/* 标签页 */
.tab-group {
  display: flex;
  gap: 2px;
  padding: 0;
  margin-bottom: 20px;
  border-radius: 8px;
  background: var(--background-secondary);
}

.tab-item {
  flex: 1;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 6px;
  color: var(--text-muted);
  user-select: none;
  text-align: center;
  font-size: 0.95em;
  font-weight: 500;
  transition: all 0.2s ease;
}

.tab-item:hover {
  background: var(--background-modifier-hover);
  color: var(--text-normal);
}

.tab-item.active {
  background: var(--interactive-accent);
  color: var(--text-on-accent);
}

/* 笔记列表 */
.notes-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-item {
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
  margin-bottom: 8px;
}

.note-item:hover {
  border-color: var(--interactive-accent);
}

.note-title-bar {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: var(--background-secondary);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.note-title-bar:hover {
  background: var(--background-modifier-hover);
}

.note-checkbox {
  margin-right: 8px;
  cursor: pointer;
}

.note-title {
  flex: 1;
  font-weight: 500;
  color: var(--text-normal);
  font-size: 0.95em;
}

/* 平台标签 */
.platform-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 500;
}

.platform-badge.github {
  background: rgba(45, 164, 78, 0.1);
  color: #2da44e;
}

/* 笔记详情 */
.note-details {
  padding: 12px;
  background: var(--background-primary);
  border-top: 1px solid var(--background-modifier-border);
  display: none;
}

.note-details:not(.hidden) {
  display: block;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.platform-info {
  padding: 12px;
  background: var(--background-secondary);
  border-radius: 6px;
}

.platform-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.platform-name {
  font-weight: 600;
  font-size: 1em;
}

.platform-name.github {
  color: #2da44e;
}

.platform-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  padding: 6px 12px;
  border-radius: 6px;
  background: var(--interactive-accent);
  color: var(--text-on-accent);
  border: none;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 500;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: var(--interactive-accent-hover);
  transform: translateY(-1px);
}

.publish-time,
.remote-path,
.status {
  font-size: 0.9em;
  color: var(--text-muted);
  margin-top: 8px;
}

/* 分页控件 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
  gap: 16px;
  margin-top: 16px;
  border-top: 1px solid var(--background-modifier-border);
}

.page-button {
  padding: 6px 16px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  background: var(--background-primary);
  color: var(--text-normal);
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s ease;
}

.page-button:not(:disabled):hover {
  background: var(--background-modifier-hover);
  border-color: var(--interactive-accent);
}

.page-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: var(--text-muted);
  font-size: 0.9em;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
  font-size: 1.1em;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.switch-tab-button {
  margin-top: 16px;
  padding: 8px 20px;
  background: var(--interactive-accent);
  color: var(--text-on-accent);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  transition: all 0.2s ease;
}

.switch-tab-button:hover {
  background: var(--interactive-accent-hover);
  transform: translateY(-1px);
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.note-item {
  animation: fadeIn 0.3s ease;
}
</style> 