<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-6">广告效果统计</h1>

    <!-- 筛选区域 -->
    <div class="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 class="text-xl font-semibold mb-4">筛选条件</h2>

      <div class="flex flex-wrap gap-4 items-end">
        <!-- 日期范围筛选 -->
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2" for="filterStartDate">
            日期从
          </label>
          <input
            class="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="filterStartDate"
            type="date"
            v-model="filterStartDate"
          />
        </div>
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2" for="filterEndDate">
            日期到
          </label>
          <input
            class="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="filterEndDate"
            type="date"
            v-model="filterEndDate"
          />
        </div>
        <!-- 活动ID筛选 -->
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2" for="filterCampaignId">
            活动 ID (可选)
          </label>
          <input
            class="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="filterCampaignId"
            type="number"
            v-model.number="filterCampaignId"
             placeholder="输入活动ID"
          >
        </div>
        <!-- 筛选按钮 -->
        <div>
          <button
            @click="fetchPerformanceData"
            class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            :disabled="isLoading"
          >
            <span v-if="isLoading">加载中...</span>
            <span v-else>应用筛选</span>
          </button>
        </div>
      </div>
      <p v-if="dateRangeError" class="text-red-500 text-xs italic mt-2">{{ dateRangeError }}</p>
    </div>

    <!-- 广告效果数据表格 -->
    <div class="bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-xl font-semibold mb-4">效果汇总数据</h2>

      <div v-if="isLoading" class="text-center text-gray-500">
        加载中...
      </div>

      <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <span class="block sm:inline">{{ error }}</span>
      </div>

      <div v-else-if="performanceData.length === 0" class="text-center text-gray-500">
        没有找到广告效果数据。请尝试调整筛选条件。
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                活动 ID
              </th>
               <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                活动名称
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创意 ID
              </th>
               <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创意标题
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                展示 (Impressions)
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                点击 (Clicks)
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                点击率 (CTR)
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="item in performanceData" :key="`${item.campaign_id}-${item.advertisement_id}`">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ item.campaign_id }}
              </td>
               <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ item.campaign_name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ item.advertisement_id }}
              </td>
               <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ item.ad_title }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ item.impressions }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ item.clicks }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatCTR(item.ctr) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import { useAuth } from '../composables/useAuth'; 

const { checkAuthStatus } = useAuth();

// --- 状态 ---
const performanceData = ref([]);
const isLoading = ref(false);
const error = ref(null);

// 筛选状态
const filterStartDate = ref(''); // "YYYY-MM-DD" string
const filterEndDate = ref('');   // "YYYY-MM-DD" string
const filterCampaignId = ref(null); // number or null (v-model.number)
const dateRangeError = ref(null); // 用于显示日期范围验证错误


// --- 计算属性/侦听器 ---

// 侦听日期范围变化进行前端简单验证
watch([filterStartDate, filterEndDate], ([newStartDate, newEndDate]) => {
    dateRangeError.value = null; // 清空之前的错误
    if (newStartDate && newEndDate && new Date(newStartDate) > new Date(newEndDate)) {
        dateRangeError.value = "结束日期不能早于开始日期";
    }
}, { immediate: false }); // 不需要立即执行


// --- 方法 ---

// 获取广告效果数据
const fetchPerformanceData = async () => {
  // 如果前端日期范围验证失败，阻止发起请求
  if (dateRangeError.value) {
      console.warn("Frontend date range validation failed, not fetching.");
      return;
  }

  isLoading.value = true;
  error.value = null; // 清空之前的错误

  const token = localStorage.getItem('jwt_token');

   if (!token) {
     error.value = '未认证，无法加载广告效果数据';
     isLoading.value = false;
      checkAuthStatus(); // 更新认证状态或重定向到登录
     return;
  }

  try {
    const params = new URLSearchParams();
    // 仅当筛选值非空时添加到参数
    if (filterStartDate.value) { params.append('start_date', filterStartDate.value); }
    if (filterEndDate.value) { params.append('end_date', filterEndDate.value); }
    // 检查 filterCampaignId 是否是有效的数字（v-model.number 会自动转换，但可能为空字符串或 NaN）
    if (filterCampaignId.value !== null && !isNaN(filterCampaignId.value) && filterCampaignId.value > 0) {
        params.append('campaign_id', filterCampaignId.value);
    }


    console.log("Fetching ad performance with params:", params.toString()); // 添加日志确认发起的请求和参数

    const response = await axios.get(`http://localhost:8080/my-performance?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log("Ad performance API response:", response); // 添加日志查看完整响应

    // 检查响应结构，特别是 data 字段是否是数组或 null
    if (response.data && response.data.data !== undefined) {
        if (Array.isArray(response.data.data)) {
             performanceData.value = response.data.data; // 赋值 (可能是空数组或包含数据的数组)
             console.log("广告效果数据加载成功:", performanceData.value);
        } else if (response.data.data === null) {
             // 后端返回 data: null，视为没有记录，赋值空数组
             performanceData.value = [];
             console.log("广告效果数据加载成功: 没有找到记录 (后端返回 null)", response.data);
        }
        else {
             // response.data.data 存在但既不是数组也不是 null，这说明后端返回了意外的类型
             error.value = `加载广告效果数据失败: 响应结构异常 (data字段类型错误) ${JSON.stringify(response.data)}`;
             console.error("加载广告效果数据失败: 响应结构异常", response.data);
        }
    } else {
         // response.data 不存在或 response.data.data 不存在，视为响应结构异常
         error.value = `加载广告效果数据失败: 响应结构异常 (缺少data字段) ${JSON.stringify(response.data)}`;
         console.error("加载广告效果数据失败: 响应结构异常", response.data);
    }


  } catch (err) {
    console.error('获取广告效果数据请求失败:', err);
     if (err.response) {
         if (err.response.status === 400) {
             // 后端返回的 400 错误通常包含具体的错误信息
              if (err.response.data && err.response.data.error) { // 检查后端返回的 error 字段
                error.value = `加载广告效果数据失败: ${err.response.data.error}`;
             } else if (err.response.data && err.response.data.msg) { // 检查后端返回的 msg 字段
                 error.value = `加载广告效果数据失败: ${err.response.data.msg}`;
             } else {
                  error.value = `加载广告效果数据失败: 请求参数无效 (status ${err.response.status})`;
             }
         } else if (err.response.status === 401 || err.response.status === 403) {
             error.value = '您没有权限访问此页面或登录已失效。';
             checkAuthStatus(); // 更新认证状态或重定向到登录
         } else if (err.response.data && err.response.data.error) { // 检查后端返回的标准错误字段
              error.value = `加载广告效果数据失败: ${err.response.data.error}`;
         } else if (err.response.data && err.response.data.msg) { // 检查后端返回的 msg 字段
              error.value = `加载广告效果数据失败: ${err.response.data.msg}`;
         }
         else {
              error.value = `加载广告效果数据失败: ${err.response.statusText || '未知错误'} (status ${err.response.status})`;
         }
         console.error("加载广告效果数据失败响应:", err.response.data);
     } else if (err.request) {
         error.value = '加载广告效果数据失败: 未收到服务器响应 (网络错误)';
     } else {
         error.value = `加载广告效果数据失败: ${err.message}`;
     }
  } finally {
    isLoading.value = false;
  }
};

// CTR 格式化函数
const formatCTR = (ctr) => {
    if (typeof ctr !== 'number' || isNaN(ctr)) {
        return '-';
    }
    return `${ctr.toFixed(2)}%`; // 后端已经计算并保留两位小数了
}


// --- 生命周期钩子 ---
onMounted(() => {
  console.log("AdPerformancePage Mounted, Fetching initial performance data...");
  fetchPerformanceData(); // 页面加载时获取一次数据 (默认范围)
});

</script>

<style scoped>
/* 可以添加一些scoped样式，例如表格的列宽或颜色 */
</style>

