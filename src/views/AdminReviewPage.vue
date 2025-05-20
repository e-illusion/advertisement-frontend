<template>
  <div>
    <h1>管理员审核列表</h1>

    <!-- 通用消息区域 -->
    <p v-if="generalMessage" :style="{ color: generalMessage.color }">{{ generalMessage.text }}</p>
    <p v-if="generalError" style="color: red;">{{ generalError }}</p>

    <!-- 待审核广告列表 -->
    <h2>待审核广告</h2>
    <p v-if="loadingAds">加载待审核广告中...</p>
    <p v-else-if="errorAds" style="color: red;">加载广告失败: {{ errorAds }}</p>
    <p v-else-if="pendingAds.length === 0">没有待审核的广告。</p>
    <div v-else>
      <ul class="review-list">
        <li v-for="ad in pendingAds" :key="ad.id" class="review-item">
          <strong>广告 ID:</strong> {{ ad.id }} <br>
          <strong>标题:</strong> {{ ad.title }} <br>
          <!-- 可以显示更多广告详情，如内容、图片URL、目标URL等 -->
          <strong>状态:</strong> {{ ad.status }} <br> <!-- 理论上这里都是 Pending -->
          <div class="actions">
            <button @click="reviewAd(ad.id, 'Approved')" :disabled="isReviewing[ad.id]">批准</button>
            <button @click="reviewAd(ad.id, 'Rejected')" :disabled="isReviewing[ad.id]" class="reject-button">拒绝</button>
            <span v-if="isReviewing[ad.id]">处理中...</span>
          </div>
           <!-- 针对单个项目的操作结果提示 -->
           <p v-if="reviewMessage[ad.id]" :style="{ color: reviewMessage[ad.id].color }">{{ reviewMessage[ad.id].text }}</p>
        </li>
      </ul>
    </div>

    <!-- 待审核活动列表 -->
    <h2>待审核活动</h2>
    <p v-if="loadingCampaigns">加载待审核活动中...</p>
    <p v-else-if="errorCampaigns" style="color: red;">加载活动失败: {{ errorCampaigns }}</p>
    <p v-else-if="pendingCampaigns.length === 0">没有待审核的活动。</p>
    <div v-else>
      <ul class="review-list">
         <li v-for="campaign in pendingCampaigns" :key="campaign.id" class="review-item">
          <strong>活动 ID:</strong> {{ campaign.id }} <br>
          <strong>广告创意 ID:</strong> {{ campaign.advertisement_id }} <br>
          <strong>用户 ID:</strong> {{ campaign.user_id }} <br>
          <strong>开始日期:</strong> {{ formatDate(campaign.start_date) }} <br>
          <strong>结束日期:</strong> {{ formatDate(campaign.end_date) }} <br>
          <strong>状态:</strong> {{ campaign.status }} <br> <!-- 理论上这里都是 Pending -->
           <div class="actions">
              <button @click="reviewCampaign(campaign.id, 'Approved')" :disabled="isReviewing[campaign.id]">批准</button>
              <button @click="reviewCampaign(campaign.id, 'Rejected')" :disabled="isReviewing[campaign.id]" class="reject-button">拒绝</button>
              <span v-if="isReviewing[campaign.id]">处理中...</span>
           </div>
           <!-- 针对单个项目的操作结果提示 -->
           <p v-if="reviewMessage[campaign.id]" :style="{ color: reviewMessage[campaign.id].color }">{{ reviewMessage[campaign.id].text }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useAuth } from '../composables/useAuth'; // 引入 useAuth

const { checkAuthStatus } = useAuth(); // 获取 checkAuthStatus 用于处理 401 错误

// --- 响应式数据 ---
const pendingAds = ref([]);
const loadingAds = ref(false);
const errorAds = ref(null);

const pendingCampaigns = ref([]);
const loadingCampaigns = ref(false);
const errorCampaigns = ref(null);

// 用于跟踪单个项目的审核状态，防止重复点击
const isReviewing = ref({}); // { itemId: boolean }

// 用于显示单个项目的审核结果消息
const reviewMessage = ref({}); // { itemId: { text: string, color: string } }

// 用于显示页面顶部的通用消息或错误
const generalMessage = ref(null);
const generalError = ref(null);

// --- 数据获取函数 ---

const fetchPendingAds = async () => {
  loadingAds.value = true;
  errorAds.value = null;
  const token = localStorage.getItem('jwt_token');

  if (!token) {
     errorAds.value = '未认证，无法加载广告列表';
     loadingAds.value = false;
     checkAuthStatus(); // 更新认证状态，可能重定向到登录页
     return;
  }

  try {
    // 调用后端获取待审核广告列表的 API
    const response = await axios.get('http://localhost:8080/admin/ads/pending', {
      headers: {
        'Authorization': `Bearer ${token}` // 携带 Token
      }
    });

    // 假设后端成功时 Data 字段是一个数组
    if (response.data && Array.isArray(response.data.data)) {
      pendingAds.value = response.data.data;
      console.log("待审核广告加载成功:", pendingAds.value);
    } else {
      errorAds.value = `加载广告列表失败: 响应结构异常 ${JSON.stringify(response.data)}`;
      console.error("加载广告列表失败: 响应结构异常", response.data);
    }

  } catch (err) {
    console.error('获取待审核广告列表失败:', err);
     if (err.response) {
         if (err.response.status === 401 || err.response.status === 403) {
             // 认证或权限错误
             generalError.value = '您没有权限访问此页面或登录已失效。';
             checkAuthStatus(); // 更新认证状态，可能重定向到登录页
         } else if (err.response.data && err.response.data.error) {
              errorAds.value = `加载广告列表失败: ${err.response.data.error}`;
         } else {
              errorAds.value = `加载广告列表失败: ${err.response.statusText || '未知错误'}`;
         }
         console.error("加载待审核广告列表响应:", err.response.data);
     } else if (err.request) {
         errorAds.value = '加载广告列表失败: 未收到服务器响应 (网络错误)';
     } else {
         errorAds.value = `加载广告列表失败: ${err.message}`;
     }
  } finally {
    loadingAds.value = false;
  }
};

const fetchPendingCampaigns = async () => {
  loadingCampaigns.value = true;
  errorCampaigns.value = null;
  const token = localStorage.getItem('jwt_token');

   if (!token) {
     errorCampaigns.value = '未认证，无法加载活动列表';
     loadingCampaigns.value = false;
      checkAuthStatus(); // 更新认证状态
     return;
  }

  try {
    // 调用后端获取待审核活动列表的 API
    const response = await axios.get('http://localhost:8080/admin/campaigns/pending', {
      headers: {
        'Authorization': `Bearer ${token}` // 携带 Token
      }
    });

    // 假设后端成功时 Data 字段是一个数组
    if (response.data && Array.isArray(response.data.data)) {
      pendingCampaigns.value = response.data.data;
      console.log("待审核活动加载成功:", pendingCampaigns.value);
    } else {
      errorCampaigns.value = `加载活动列表失败: 响应结构异常 ${JSON.stringify(response.data)}`;
      console.error("加载活动列表失败: 响应结构异常", response.data);
    }

  } catch (err) {
    console.error('获取待审核活动列表失败:', err);
     if (err.response) {
         if (err.response.status === 401 || err.response.status === 403) {
             // 认证或权限错误 (由第一个请求处理或由路由守卫处理，这里仅作为 fallback)
             // generalError.value = '您没有权限访问此页面或登录已失效。';
             checkAuthStatus(); // 更新认证状态
         } else if (err.response.data && err.response.data.error) {
              errorCampaigns.value = `加载活动列表失败: ${err.response.data.error}`;
         } else {
              errorCampaigns.value = `加载活动列表失败: ${err.response.statusText || '未知错误'}`;
         }
         console.error("加载待审核活动列表响应:", err.response.data);
     } else if (err.request) {
         errorCampaigns.value = '加载活动列表失败: 未收到服务器响应 (网络错误)';
     } else {
         errorCampaigns.value = `加载活动列表失败: ${err.message}`;
     }
  } finally {
    loadingCampaigns.value = false;
  }
};

// --- 审核操作函数 ---

const reviewAd = async (adId, status) => {
  isReviewing.value[adId] = true; // 设置该项目为处理中
  reviewMessage.value[adId] = null; // 清除之前的消息
  generalError.value = null; // 清除通用错误

  const token = localStorage.getItem('jwt_token');
  if (!token) {
     reviewMessage.value[adId] = { text: '未认证，无法执行操作', color: 'red' };
     isReviewing.value[adId] = false;
     checkAuthStatus();
     return;
  }

  try {
    // 调用后端审核广告的 PATCH 接口
    const response = await axios.patch(`http://localhost:8080/ads/${adId}/status`, { status: status }, {
      headers: {
        'Authorization': `Bearer ${token}`, // 携带 Token
        'Content-Type': 'application/json'
      }
    });

    // 假设后端成功时返回 message
    if (response.data && response.data.message) {
      reviewMessage.value[adId] = { text: response.data.message, color: 'green' };
      console.log(`广告 ${adId} ${status} 成功:`, response.data);

      // 成功后将该广告从 pendingAds 列表中移除 (或者重新加载列表)
      // 简单起见，我们重新加载列表以确保数据最新
      setTimeout(fetchPendingAds, 1000); // 延迟一点重新加载，让用户看到成功消息

    } else {
       reviewMessage.value[adId] = { text: `操作失败: 响应结构异常 ${JSON.stringify(response.data)}`, color: 'red' };
       console.error(`广告 ${adId} ${status} 失败: 响应结构异常`, response.data);
    }

  } catch (err) {
    console.error(`审核广告 ${adId} 失败:`, err);
     if (err.response) {
         if (err.response.status === 401 || err.response.status === 403) {
             generalError.value = '您没有权限执行此操作或登录已失效。';
             checkAuthStatus();
         } else if (err.response.data && err.response.data.error) {
              reviewMessage.value[adId] = { text: `操作失败: ${err.response.data.error}`, color: 'red' };
         } else {
              reviewMessage.value[adId] = { text: `操作失败: ${err.response.statusText || '未知错误'}`, color: 'red' };
         }
         console.error(`审核广告 ${adId} 失败响应:`, err.response.data);
     } else if (err.request) {
         reviewMessage.value[adId] = { text: '操作失败: 未收到服务器响应 (网络错误)', color: 'red' };
     } else {
         reviewMessage.value[adId] = { text: `操作失败: ${err.message}`, color: 'red' };
     }
  } finally {
    isReviewing.value[adId] = false; // 结束处理状态
  }
};

const reviewCampaign = async (campaignId, status) => {
  isReviewing.value[campaignId] = true; // 设置该项目为处理中
  reviewMessage.value[campaignId] = null; // 清除之前的消息
  generalError.value = null; // 清除通用错误

  const token = localStorage.getItem('jwt_token');
  if (!token) {
     reviewMessage.value[campaignId] = { text: '未认证，无法执行操作', color: 'red' };
     isReviewing.value[campaignId] = false;
     checkAuthStatus();
     return;
  }

  try {
    // 调用后端审核活动的 PATCH 接口
    const response = await axios.patch(`http://localhost:8080/campaigns/${campaignId}/status`, { status: status }, {
      headers: {
        'Authorization': `Bearer ${token}`, // 携带 Token
        'Content-Type': 'application/json'
      }
    });

    // 假设后端成功时返回 message
     if (response.data && response.data.message) {
      reviewMessage.value[campaignId] = { text: response.data.message, color: 'green' };
      console.log(`活动 ${campaignId} ${status} 成功:`, response.data);

      // 成功后将该活动从 pendingCampaigns 列表中移除 (或者重新加载列表)
      // 简单起见，我们重新加载列表以确保数据最新
       setTimeout(fetchPendingCampaigns, 1000); // 延迟一点重新加载

    } else {
       reviewMessage.value[campaignId] = { text: `操作失败: 响应结构异常 ${JSON.stringify(response.data)}`, color: 'red' };
       console.error(`活动 ${campaignId} ${status} 失败: 响应结构异常`, response.data);
    }

  } catch (err) {
    console.error(`审核活动 ${campaignId} 失败:`, err);
     if (err.response) {
         if (err.response.status === 401 || err.response.status === 403) {
             generalError.value = '您没有权限执行此操作或登录已失效。';
             checkAuthStatus();
         } else if (err.response.data && err.response.data.error) {
              reviewMessage.value[campaignId] = { text: `操作失败: ${err.response.data.error}`, color: 'red' };
         } else {
              reviewMessage.value[campaignId] = { text: `操作失败: ${err.response.statusText || '未知错误'}`, color: 'red' };
         }
         console.error(`审核活动 ${campaignId} 失败响应:`, err.response.data);
     } else if (err.request) {
         reviewMessage.value[campaignId] = { text: '操作失败: 未收到服务器响应 (网络错误)', color: 'red' };
     } else {
         reviewMessage.value[campaignId] = { text: `操作失败: ${err.message}`, color: 'red' };
     }
  } finally {
    isReviewing.value[campaignId] = false; // 结束处理状态
  }
};

// --- 辅助函数 ---
const formatDate = (dateString) => {
    // 后端返回的日期可能是 YYYY-MM-DD 格式，直接显示即可
    // 如果后端返回的是完整的 ISO 时间字符串 (如 "2023-10-26T12:00:00Z")
    // 你可能需要更复杂的日期格式化，例如使用 date-fns 库
    if (!dateString) return 'N/A';
    // 对于 YYYY-MM-DD 格式，直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
    }
    // 对于其他格式，尝试解析并格式化 (简单示例)
     try {
        const date = new Date(dateString);
        if (!isNaN(date)) {
             return date.toLocaleDateString(); // 使用浏览器本地格式
        }
     } catch (e) {
         console.error("日期格式化错误:", dateString, e);
     }
    return dateString; // 格式化失败则返回原始字符串
};


// --- 生命周期钩子：组件挂载时加载数据 ---
onMounted(() => {
  // 页面加载时，如果是管理员，则自动加载待审核列表
  const userInfoString = localStorage.getItem('user_info');
  let userIsAdmin = false;
  if (userInfoString) {
      try {
          const userInfo = JSON.parse(userInfoString);
          if (userInfo && userInfo.role === 'admin') {
             userIsAdmin = true;
          }
      } catch (e) {
          console.error("Failed to parse user_info for onMounted check", e);
      }
  }

  if (userIsAdmin) {
      fetchPendingAds();
      fetchPendingCampaigns();
  } else {
      // 理论上路由守卫会阻止非管理员访问，但这里做个双重检查
      generalError.value = "您不是管理员，无权查看此页面。";
      // 也可以直接重定向到首页或登录页
      // router.push('/');
  }

});

</script>

<style scoped>
h1 {
  color: darkred; /* 审核页面用不同颜色标题 */
}

h2 {
    margin-top: 20px;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
    color: #555;
}

.review-list {
  list-style: none;
  padding: 0;
}

.review-item {
  border: 1px solid #ccc;
  margin-bottom: 15px;
  padding: 15px;
  border-radius: 5px;
  background-color: #f9f9f9;
}

.actions {
    margin-top: 10px;
}

.actions button {
    margin-right: 10px;
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

.approve-button {
    background-color: #28a745; /* 绿色 */
    color: white;
}

.reject-button {
    background-color: #dc3545; /* 红色 */
    color: white;
}
</style>
