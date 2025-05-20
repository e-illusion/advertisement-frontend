<template>
  <div>
    <h1>请求广告活动</h1>

    <!-- 提交状态和消息 -->
    <p v-if="isSubmitting">提交中...</p>

    <!-- 成功消息 -->
    <p v-if="successMessage" style="color: green;">{{ successMessage }}</p>

    <!-- 错误消息 -->
    <!-- 这里显示后端返回的通用错误信息 -->
    <p v-if="errorMessage" style="color: red;">{{ errorMessage }}</p>

    <!-- 活动请求表单 -->
    <form @submit.prevent="handleSubmit">
      <div>
        <label for="advertisementId">广告创意 ID:</label>
        <!-- 注意：这里我们使用 number 类型的 input -->
        <input type="number" id="advertisementId" v-model.number="campaignData.advertisementId" required min="1">
        <p class="help-text">输入您**已批准**的广告创意 ID。</p>
      </div>

      <div>
        <label for="startDate">开始日期:</label>
        <!-- 使用 date 类型的 input，浏览器会提供日期选择器 -->
        <input type="date" id="startDate" v-model="campaignData.startDate" required>
      </div>

      <div>
        <label for="endDate">结束日期:</label>
         <!-- 使用 date 类型的 input -->
        <input type="date" id="endDate" v-model="campaignData.endDate" required>
      </div>

      <button type="submit" :disabled="isSubmitting">提交活动请求</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter(); // 获取路由器实例

// 定义响应式数据来存储表单输入和提交状态
const campaignData = ref({
  advertisementId: null, // 注意：初始化为 null 或 0，number 类型
  startDate: '',
  endDate: ''
});

const isSubmitting = ref(false); // 提交状态
const successMessage = ref(null); // 成功消息
const errorMessage = ref(null);   // 错误消息

// 处理表单提交的异步函数
const handleSubmit = async () => {
  isSubmitting.value = true;
  successMessage.value = null;
  errorMessage.value = null;

  // 1. 从 localStorage 获取 Token
  const token = localStorage.getItem('jwt_token');

  // 2. 检查 Token
  if (!token) {
    errorMessage.value = '您尚未登录，无法请求活动。';
    isSubmitting.value = false;
    console.warn('未找到 Token，请先登录');
     setTimeout(() => {
       router.push('/login');
    }, 2000);
    return;
  }

  // 3. 准备要发送到后端的数据
  // 注意：后端期望 advertisement_id (int), start_date (string), end_date (string)
  const payload = {
    advertisement_id: campaignData.value.advertisementId, // advertisementId 会被 v-model.number 转换为数字
    start_date: campaignData.value.startDate, // date input 的 value 已经是 YYYY-MM-DD 格式的字符串
    end_date: campaignData.value.endDate
  };

  try {
    // 4. 发送 POST 请求到 /campaigns 接口
    const response = await axios.post('http://localhost:8080/campaigns', payload, {
      headers: {
        'Authorization': `Bearer ${token}`, // 携带 Token
        'Content-Type': 'application/json' // 明确指定发送 JSON
      }
    });

    // 5. 处理后端成功响应 (状态码 201)
    if (response.data && response.data.message && response.data.data && response.data.data.campaign_id) {
      successMessage.value = response.data.message + ` (新活动ID: ${response.data.data.campaign_id})`;
      console.log("广告活动请求成功:", response.data);

      // 成功后清空表单（可选）
      // campaignData.value = {
      //   advertisementId: null,
      //   startDate: '',
      //   endDate: ''
      // };

      // 可选：成功后自动跳转到我的活动列表页面 (如果以后有这个页面)
      // setTimeout(() => {
      //    router.push('/my-campaigns');
      // }, 2000); // 延迟两秒跳转

    } else {
      // 如果响应结构不符合预期
       errorMessage.value = `提交活动请求失败: 响应结构异常 ${JSON.stringify(response.data)}`;
       console.error("提交活动请求失败: 响应结构异常", response.data);
    }

  } catch (err) {
    // 6. 处理错误
    console.error('提交活动请求失败:', err);

    if (err.response) {
      // 后端返回了错误响应
      if (err.response.status === 401) {
        // Token 无效或过期
        errorMessage.value = '登录状态无效，请重新登录。';
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_info'); // 清除用户信息
        setTimeout(() => {
           router.push('/login');
        }, 2000);

      } else if (err.response.data && err.response.data.error) {
        // 显示后端返回的通用错误信息 (例如验证错误)
        errorMessage.value = `提交活动请求失败: ${err.response.data.error}`;

      } else {
        // 显示其他类型的后端错误信息
        errorMessage.value = `提交活动请求失败: ${err.response.statusText || '未知错误'}`;
      }
      console.error("提交活动请求失败响应:", err.response.data);

    } else if (err.request) {
      // 请求已发送但没有收到响应
      errorMessage.value = '提交活动请求失败: 未收到服务器响应 (网络错误)';
    } else {
      // 其他错误
      errorMessage.value = `提交活动请求失败: ${err.message}`;
    }

  } finally {
    // 无论成功或失败，请求完成后设置提交状态为 false
    isSubmitting.value = false;
  }
};

</script>

<style scoped>
/* 这里可以添加 RequestCampaignPage 的样式 */
h1 {
  color: purple; /* 临时加个样式方便区分 */
}

form div {
    margin-bottom: 15px;
}

label {
    display: block; /* 让 label 独占一行 */
    margin-bottom: 5px;
    font-weight: bold;
}

input[type="number"],
input[type="date"] {
    width: calc(100% - 22px); /* 减去 padding 和 border 的宽度 */
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
}

.help-text {
    font-size: 0.8em;
    color: #666;
    margin-top: 5px;
}


button[type="submit"] {
    padding: 10px 20px;
    background-color: #007bff; /* 蓝色背景 */
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
}

button[type="submit"]:hover:not(:disabled) {
    background-color: #0056b3; /* 悬停颜色 */
}

button[type="submit"]:disabled {
    background-color: #cccccc; /* 禁用时的颜色 */
    cursor: not-allowed;
}
</style>
