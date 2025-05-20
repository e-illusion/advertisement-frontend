<template>
  <div>
    <h1>发布新广告</h1>

    <!-- 提交状态和消息 -->
    <p v-if="isSubmitting">提交中...</p>

    <!-- 成功消息 -->
    <p v-if="successMessage" style="color: green;">{{ successMessage }}</p>

    <!-- 错误消息 -->
    <!-- 这里显示后端返回的通用错误信息 -->
    <p v-if="errorMessage" style="color: red;">{{ errorMessage }}</p>

    <!-- 广告发布表单 -->
    <form @submit.prevent="handleSubmit">
      <div>
        <label for="title">广告标题:</label>
        <!-- v-model 双向绑定 input 的值到 adData.title -->
        <input type="text" id="title" v-model="adData.title" required>
        <!-- 如果后端返回的是字段级别的错误，可以在这里显示，但根据您提供的后端代码，目前只能显示通用错误 -->
        <!-- <p v-if="validationErrors.title">{{ validationErrors.title }}</p> -->
      </div>

      <div>
        <label for="imageUrl">图片 URL:</label>
        <input type="url" id="imageUrl" v-model="adData.imageUrl" required>
        <!-- <p v-if="validationErrors.image_url">{{ validationErrors.image_url }}</p> -->
      </div>

      <div>
        <label for="targetUrl">目标 URL:</label>
        <input type="url" id="targetUrl" v-model="adData.targetUrl" required>
        <!-- <p v-if="validationErrors.target_url">{{ validationErrors.target_url }}</p> -->
      </div>

      <div>
         <label for="content">广告内容 (可选):</label>
         <textarea id="content" v-model="adData.content" rows="4"></textarea>
      </div>


      <button type="submit" :disabled="isSubmitting">发布广告</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'; // 引入 ref
import axios from 'axios'; // 引入 axios
import { useRouter } from 'vue-router'; // 用于重定向

const router = useRouter(); // 获取路由器实例

// 定义响应式数据来存储表单输入和提交状态
const adData = ref({
  title: '',
  imageUrl: '', // 注意这里使用了驼峰命名，提交时需要转换为 snake_case
  targetUrl: '', // 注意这里使用了驼峰命名
  content: '' // 广告内容，虽然后端没有处理，但前端可以先加着
});

const isSubmitting = ref(false); // 提交状态，防止重复点击
const successMessage = ref(null); // 成功消息
const errorMessage = ref(null);   // 错误消息 (通用错误)
// const validationErrors = ref({}); // 如果后端返回字段级别的错误，可以用这个来存储

// 处理表单提交的异步函数
const handleSubmit = async () => {
  isSubmitting.value = true; // 设置提交状态为 true
  successMessage.value = null; // 清空之前的成功消息
  errorMessage.value = null;   // 清空之前的错误消息
  // validationErrors.value = {}; // 清空之前的验证错误

  // 1. 从 localStorage 获取 Token
  const token = localStorage.getItem('jwt_token');

  // 2. 检查 Token (虽然有路由守卫，但在这里检查更安全)
  if (!token) {
    errorMessage.value = '您尚未登录，无法发布广告。';
    isSubmitting.value = false;
    console.warn('未找到 Token，请先登录');
     setTimeout(() => {
       router.push('/login');
    }, 2000);
    return;
  }

  // 3. 准备要发送到后端的数据
  // 注意：后端期望的是 snake_case 格式的字段名 (title, image_url, target_url)
  // 前端为了遵循 JS 习惯使用了 camelCase (title, imageUrl, targetUrl)
  const payload = {
    title: adData.value.title,
    image_url: adData.value.imageUrl, // 转换为 snake_case
    target_url: adData.value.targetUrl, // 转换为 snake_case
    // content 字段后端未处理，暂时不发送，或者发送了后端忽略
    // content: adData.value.content
  };

  try {
    // 4. 发送 POST 请求到 /ads 接口
    const response = await axios.post('http://localhost:8080/ads', payload, {
      headers: {
        'Authorization': `Bearer ${token}`, // 携带 Token
        'Content-Type': 'application/json' // 明确指定发送 JSON
      }
    });

    // 5. 处理后端成功响应 (状态码 201)
    // 根据您提供的结构 {"message":"广告提交成功，等待审核","data":{"new_ad_id":10}}
    if (response.data && response.data.message && response.data.data && response.data.data.new_ad_id) {
      successMessage.value = response.data.message + ` (新广告ID: ${response.data.data.new_ad_id})`;
      console.log("广告发布成功:", response.data);

      // 成功后清空表单
      adData.value = {
        title: '',
        imageUrl: '',
        targetUrl: '',
        content: ''
      };

      // 可选：成功后自动跳转到我的广告页面
      // setTimeout(() => {
      //    router.push('/my-ads');
      // }, 2000); // 延迟两秒跳转，让用户看到成功消息

    } else {
      // 如果响应结构不符合预期
       errorMessage.value = `发布广告失败: 响应结构异常 ${JSON.stringify(response.data)}`;
       console.error("发布广告失败: 响应结构异常", response.data);
    }

  } catch (err) {
    // 6. 处理错误
    console.error('发布广告请求失败:', err);

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
        errorMessage.value = `发布广告失败: ${err.response.data.error}`;
        // 如果后端返回字段级别的错误，这里需要额外的逻辑来解析并赋值给 validationErrors.value
        // 例如：if (err.response.data.errors) { validationErrors.value = err.response.data.errors; }

      } else {
        // 显示其他类型的后端错误信息
        errorMessage.value = `发布广告失败: ${err.response.statusText || '未知错误'}`;
      }
      console.error("发布广告失败响应:", err.response.data);

    } else if (err.request) {
      // 请求已发送但没有收到响应
      errorMessage.value = '发布广告失败: 未收到服务器响应 (网络错误)';
    } else {
      // 其他错误
      errorMessage.value = `发布广告失败: ${err.message}`;
    }

  } finally {
    // 无论成功或失败，请求完成后设置提交状态为 false
    isSubmitting.value = false;
  }
};

</script>

<style scoped>
/* 这里可以添加 CreateAdPage 的样式 */
h1 {
  color: green; /* 临时加个样式方便区分 */
}

form div {
    margin-bottom: 15px;
}

label {
    display: block; /* 让 label 独占一行 */
    margin-bottom: 5px;
    font-weight: bold;
}

input[type="text"],
input[type="url"],
textarea {
    width: calc(100% - 22px); /* 减去 padding 和 border 的宽度 */
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
}

textarea {
    resize: vertical; /* 只允许垂直方向拉伸 */
}

button[type="submit"] {
    padding: 10px 20px;
    background-color: #4CAF50; /* 绿色背景 */
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
}

button[type="submit"]:hover:not(:disabled) {
    background-color: #45a049; /* 悬停颜色 */
}

button[type="submit"]:disabled {
    background-color: #cccccc; /* 禁用时的颜色 */
    cursor: not-allowed;
}
</style>
