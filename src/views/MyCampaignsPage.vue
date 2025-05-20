<template>
  <div>
    <h1>我的广告活动</h1>

    <!-- 如果正在加载，显示加载中 -->
    <p v-if="isLoading">加载广告活动中...</p>

    <!-- 如果有错误信息，显示错误 -->
    <p v-else-if="error" style="color: red;">错误: {{ error }}</p>

    <!-- 筛选表单 -->
    <div class="filter-form" v-else>
        <h3>筛选活动</h3>
        <label for="filterStatus">状态:</label>
        <select id="filterStatus" v-model="filterStatus">
            <option value="">所有状态</option>
            <!-- 根据后端支持的状态添加选项 -->
            <option value="Pending">待审核</option>
            <option value="Approved">已批准</option>
            <option value="Rejected">已拒绝</option>
            <option value="Cancelled">已取消</option>
            <option value="Active">投放中</option>
            <option value="Completed">已完成</option>
        </select>

         <label for="filterStartDate">开始日期:</label>
         <input type="date" id="filterStartDate" v-model="filterStartDate">

         <label for="filterEndDate">结束日期:</label>
         <input type="date" id="filterEndDate" v-model="filterEndDate">

        <button @click="fetchUserCampaigns">应用筛选</button>
        <button @click="resetFilters">重置筛选</button>
    </div>


    <!-- 广告活动列表 -->
    <p v-if="!isLoading && !error && campaigns.length === 0">没有找到广告活动。</p>
    <ul v-else-if="!isLoading && !error" class="campaign-list">
        <li v-for="campaign in campaigns" :key="campaign.id" class="campaign-item">
            <strong>活动 ID:</strong> {{ campaign.id }} <br>
            <strong>广告创意 ID:</strong> {{ campaign.advertisement_id }} <br>
            <!-- 用户 ID 不用显示给用户自己看 -->
            <!-- <strong>用户 ID:</strong> {{ campaign.user_id }} <br> -->
            <strong>开始日期:</strong> {{ formatDate(campaign.start_date) }} <br>
            <strong>结束日期:</strong> {{ formatDate(campaign.end_date) }} <br>
            <strong>创建时间:</strong> {{ formatDateTime(campaign.created_at) }} <br>
            <strong>状态:</strong> <span :class="'status-' + campaign.status.toLowerCase()">{{ campaign.status }}</span> <br>
            <!-- 可以根据需要显示更多详情 -->

            <div class="actions">
                <!-- 只有特定状态的活动才能取消 -->
                <button
                    v-if="['Pending', 'Approved'].includes(campaign.status)"
                    @click="handleCancel(campaign.id)"
                    :disabled="isCancelling[campaign.id]"
                    class="cancel-button"
                >
                   {{ isCancelling[campaign.id] ? '取消中...' : '取消活动' }}
                </button>
                 <!-- 针对单个项目的操作结果提示 -->
                <p v-if="cancelMessage[campaign.id]" style="color: green; margin-top: 5px;">{{ cancelMessage[campaign.id] }}</p>
                <p v-if="cancelError[campaign.id]" style="color: red; margin-top: 5px;">{{ cancelError[campaign.id] }}</p>
            </div>
        </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useAuth } from '../composables/useAuth'; // 引入 useAuth

const { checkAuthStatus } = useAuth(); // 获取 checkAuthStatus 用于处理 401 错误

// --- 广告活动列表数据 ---
const campaigns = ref([]);
const isLoading = ref(false); // 列表加载状态
const error = ref(null);      // 列表错误信息

// --- 筛选条件 ---
const filterStatus = ref(''); // 绑定到状态选择框
const filterStartDate = ref(null); // 绑定到开始日期输入框 (YYYY-MM-DD 字符串)
const filterEndDate = ref(null);   // 绑定到结束日期输入框 (YYYY-MM-DD 字符串)

// --- 取消操作相关数据 ---
const isCancelling = ref({});  // { campaignId: boolean } 用于跟踪单个活动的取消状态
const cancelMessage = ref({}); // { campaignId: string } 用于显示单个活动的取消成功消息
const cancelError = ref({});   // { campaignId: string } 用于显示单个活动的取消失败错误


// --- 数据获取函数 ---

const fetchUserCampaigns = async () => {
  isLoading.value = true;
  error.value = null;
  const token = localStorage.getItem('jwt_token');

   if (!token) {
     error.value = '未认证，无法加载广告活动列表';
     isLoading.value = false;
      checkAuthStatus(); // 更新认证状态
     return;
  }

  try {
    // 构建查询参数
    const params = new URLSearchParams();
    if (filterStatus.value) {
        params.append('status', filterStatus.value);
    }
    // 日期输入框通常返回 YYYY-MM-DD 格式字符串，符合后端要求
    if (filterStartDate.value) {
        params.append('start_date', filterStartDate.value);
    }
    if (filterEndDate.value) {
        params.append('end_date', filterEndDate.value);
    }

    // 发送 GET 请求到 /my-campaigns 接口
    const response = await axios.get(`http://localhost:8080/my-campaigns?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.data && response.data.data !== undefined) {
        // 检查 response.data.data 是数组还是 null
        if (Array.isArray(response.data.data)) {
            campaigns.value = response.data.data; // 是数组，直接使用
            console.log("用户广告活动加载成功:", campaigns.value);
        } else if (response.data.data === null) {
            campaigns.value = []; // 是 null，视为空数组
            console.log("用户广告活动加载成功: 没有找到活动 (后端返回 null 数据)");
        } else {
             // data 字段存在但既不是数组也不是 null，这是真正的结构异常
             error.value = `加载广告活动失败: 响应结构异常 (data字段类型错误) ${JSON.stringify(response.data)}`;
             console.error("加载广告活动失败: 响应结构异常 (data字段类型错误)", response.data);
        }
    } else {
       // response.data 不存在或 data 字段不存在
       error.value = `加载广告活动失败: 响应结构异常 (缺少data字段) ${JSON.stringify(response.data)}`;
       console.error("加载广告活动失败: 响应结构异常 (缺少data字段)", response.data);
    }

  } catch (err) {
    console.error('获取用户广告活动请求失败:', err);
     if (err.response) {
         if (err.response.status === 401 || err.response.status === 403) {
             error.value = '您没有权限访问此页面或登录已失效。';
             checkAuthStatus();
         } else if (err.response.data && err.response.data.error) { // 检查后端的 error 字段
              error.value = `加载广告活动失败: ${err.response.data.error}`;
         } else if (err.response.data && err.response.data.msg) { // 检查后端的 msg 字段
              // 理论上 GET 不返回 msg 但为了健壮性加上
              error.value = `加载广告活动失败: ${err.response.data.msg}`;
         } else {
              error.value = `加载广告活动失败: ${err.response.statusText || '未知错误'}`;
         }
         console.error("加载用户广告活动失败响应:", err.response.data);
     } else if (err.request) {
         error.value = '加载广告活动失败: 未收到服务器响应 (网络错误)';
     } else {
         error.value = `加载广告活动失败: ${err.message}`;
     }
  } finally {
    isLoading.value = false;
  }
};

// 处理取消广告活动请求 (新增)
const handleCancel = async (campaignId) => {
    // 清空该活动的取消消息和错误
    cancelMessage.value[campaignId] = null;
    cancelError.value[campaignId] = null;
    // 设置该活动为取消中状态
    isCancelling.value[campaignId] = true;

    const token = localStorage.getItem('jwt_token');
    if (!token) {
        cancelError.value[campaignId] = '您尚未登录，无法取消活动。';
        isCancelling.value[campaignId] = false;
        checkAuthStatus();
        return;
    }

    try {
        // 发送 PATCH 请求到 /my-campaigns/{id}/cancel 接口
        const response = await axios.patch(`http://localhost:8080/my-campaigns/${campaignId}/cancel`, {}, { // 发送空请求体 {}
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' // 即使是空体，最好也声明类型
            }
        });

        if (response.data && response.data.msg) { // 注意这里检查的是 msg 字段
             cancelMessage.value[campaignId] = response.data.msg;
             console.log(`活动 ${campaignId} 取消成功:`, response.data);

             // 取消成功后，刷新列表以更新活动状态（或从列表中移除）
             setTimeout(fetchUserCampaigns, 500); // 延迟刷新，让用户看到成功消息

        } else {
            // 响应结构不符合预期
             cancelError.value[campaignId] = `取消失败: 响应结构异常 ${JSON.stringify(response.data)}`;
             console.error(`活动 ${campaignId} 取消失败: 响应结构异常`, response.data);
        }

    } catch (err) {
        // 处理错误
        console.error(`取消活动 ${campaignId} 请求失败:`, err);
        if (err.response) {
             if (err.response.status === 401 || err.response.status === 403) {
                 cancelError.value[campaignId] = '登录状态无效或无权取消此活动，请重新登录。';
                 checkAuthStatus(); // 可能重定向到登录页
            } else if (err.response.data && err.response.data.error) { // 检查后端的 error 字段
                 cancelError.value[campaignId] = `取消失败: ${err.response.data.error}`;
             } else if (err.response.data && err.response.data.msg) { // 检查后端的 msg 字段 (虽然 PATCH 错误通常返回 error)
                  cancelError.value[campaignId] = `取消失败: ${err.response.data.msg}`;
             }
             else {
                 cancelError.value[campaignId] = `取消失败: ${err.response.statusText || '未知错误'}`;
             }
            console.error(`取消活动 ${campaignId} 失败响应:`, err.response.data);
        } else if (err.request) {
             cancelError.value[campaignId] = '取消失败: 未收到服务器响应 (网络错误)';
        } else {
             cancelError.value[campaignId] = `取消失败: ${err.message}`;
        }
    } finally {
        isCancelling.value[campaignId] = false; // 结束取消加载状态
    }
};


// 重置筛选条件
const resetFilters = () => {
    filterStatus.value = '';
    filterStartDate.value = null;
    filterEndDate.value = null;
    // 重置后自动刷新列表
    fetchUserCampaigns();
};

// 辅助函数：格式化日期 (YYYY-MM-DD)
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    try {
        // 尝试解析 ISO 字符串
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
             // 格式化为 YYYY-MM-DD
             const year = date.getFullYear();
             const month = String(date.getMonth() + 1).padStart(2, '0');
             const day = String(date.getDate()).padStart(2, '0');
             return `${year}-${month}-${day}`;
        }
     } catch (e) {
         console.error("日期格式化错误:", dateString, e);
     }
     // 如果无法解析或已经是 YYYY-MM-DD 格式，直接返回
    return dateString;
};

// 辅助函数：格式化日期时间 (例如 CreatedAt)
const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';

    try {
        const date = new Date(dateTimeString);
         if (!isNaN(date.getTime())) {
             // 使用浏览器本地格式，或者自定义格式
             const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
             return new Intl.DateTimeFormat('zh-CN', options).format(date);
        }
    } catch (e) {
        console.error("日期时间格式化错误:", dateTimeString, e);
    }
    return dateTimeString; // 格式化失败返回原始字符串
};


// --- 生命周期钩子 ---
onMounted(() => {
  console.log("MyCampaignsPage Mounted, Fetching user campaigns...");
  fetchUserCampaigns(); // 页面加载后立即获取用户活动列表
});

</script>

<style scoped>
h1 {
  color: #007bff; /* 蓝色标题 */
}
h2 {
    margin-top: 20px;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
    color: #555;
}

.filter-form {
    margin-bottom: 20px;
    padding: 15px;
    border: 1px solid #eee;
    border-radius: 5px;
    background-color: #f9f9f9;
}

.filter-form label {
    margin-right: 5px;
    margin-left: 10px;
    font-weight: bold;
}
.filter-form label:first-child {
     margin-left: 0;
}

.filter-form input[type="date"],
.filter-form select {
    margin-right: 10px;
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.filter-form button {
     padding: 5px 10px;
     cursor: pointer;
     border: none;
     border-radius: 4px;
     margin-right: 5px;
     background-color: #007bff;
     color: white;
}
.filter-form button:hover:not(:disabled) {
    background-color: #0056b3;
}
.filter-form button:last-child {
     margin-right: 0;
     background-color: #6c757d;
}
.filter-form button:last-child:hover:not(:disabled) {
     background-color: #5a6268;
}
.filter-form button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}


.campaign-list {
  list-style: none;
  padding: 0;
}

.campaign-item {
  border: 1px solid #ccc;
  margin-bottom: 10px;
  padding: 15px;
  border-radius: 5px;
  background-color: #fff;
  position: relative; /* 用于定位操作按钮区域 */
}

.campaign-item strong {
    display: inline-block; /* 让标题独占一行或有固定宽度 */
    width: 120px; /* 根据需要调整宽度 */
    text-align: right;
    margin-right: 5px;
}

.actions {
    margin-top: 10px;
    /* 可以考虑绝对定位，让按钮浮在卡片右上角 */
    /* position: absolute;
    top: 10px;
    right: 10px; */
}

.actions button {
    padding: 5px 10px;
    cursor: pointer;
    border: none;
    border-radius: 4px;
}

.actions button:hover:not(:disabled) {
    opacity: 0.9;
}

.actions button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.cancel-button {
    background-color: #dc3545; /* 红色 */
    color: white;
}

/* 活动状态颜色 */
.status-pending { color: orange; }
.status-approved { color: green; }
.status-rejected { color: red; }
.status-cancelled { color: gray; }
.status-active { color: #007bff; font-weight: bold; }
.status-completed { color: purple; }

</style>
