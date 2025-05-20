<template>
  <div>
    <h1>我的广告列表</h1>

    <!-- 加载状态提示 -->
    <p v-if="isLoading">加载中...</p>

    <!-- 错误信息提示 -->
    <p v-else-if="error" style="color: red;">错误: {{ error }}</p>

    <!-- 如果没有加载中且没有错误，显示广告列表或空状态 -->
    <div v-else>
      <!-- 如果 ads 数组有数据，显示列表 -->
      <div v-if="ads && ads.length > 0">
        <h2>我的广告 ({{ ads.length }} 条)</h2>
        <ul>
          <!-- 遍历 ads 数组，为每个广告创建一个列表项 -->
          <!-- 使用广告的 id 作为 key，这有助于 Vue 高效更新列表 -->
          <li v-for="ad in ads" :key="ad.id">
            <!-- 显示广告的关键信息 -->
            <h3>{{ ad.title }}</h3>
            <p>状态: {{ ad.status }}</p>
            <!-- 如果有图片 URL 且是有效的图片格式，可以尝试显示图片 -->
            <img v-if="ad.image_url && isImageUrl(ad.image_url)" :src="ad.image_url" alt="广告图片" style="max-width: 100px; max-height: 100px; margin-top: 10px;">
            <p v-if="ad.target_url">目标链接: <a :href="ad.target_url" target="_blank">{{ ad.target_url }}</a></p>
            <!-- 可以根据需要显示更多字段，比如 ID 等 -->
            <p>ID: {{ ad.id }}</p>
            <hr> <!-- 分隔符 -->
          </li>
        </ul>
      </div>

      <!-- 如果 ads 数组为空，显示没有广告的提示 -->
      <p v-else>您还没有发布任何广告。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

// 定义响应式数据
const ads = ref([]); // 用于存储获取到的广告列表，初始化为空数组
const isLoading = ref(false); // 加载状态
const error = ref(null);     // 错误信息

const router = useRouter(); // 获取路由器实例

// 在组件挂载后执行，获取广告列表
onMounted(() => {
  fetchMyAds();
});

// 获取用户广告列表的异步函数
const fetchMyAds = async () => {
  isLoading.value = true; // 开始加载
  error.value = null;     // 清空错误信息
  ads.value = [];         // 清空之前的广告数据

  // 1. 从 localStorage 获取 Token
  const token = localStorage.getItem('jwt_token');

  // 2. 检查 Token 是否存在 (尽管有路由守卫，这里再检查一次更健壮)
  if (!token) {
    error.value = '您尚未登录，请先登录。';
    isLoading.value = false;
    console.warn('未找到 Token，无法获取我的广告');
    // 如果未找到 Token，直接跳转到登录页 (路由守卫也会做，但我们在这里显式处理一下，特别是当直接访问 /my-ads 时)
    // 使用 setTimeout 是为了让用户看到错误信息几秒钟再跳转
    setTimeout(() => {
       router.push('/login');
    }, 2000);
    return;
  }

  try {
    // 3. 发送 GET 请求到 /my-ads 接口，并在请求头中携带 Token
    // 根据后端接口，URL 是 http://localhost:8080/my-ads
    const response = await axios.get('http://localhost:8080/my-ads', {
      headers: {
        'Authorization': `Bearer ${token}` // 携带 Token
      }
    });

// 1. 检查 response.data 是否存在
    if (response.data) {
        // 2. 检查 response.data.data 是否存在
        // 并且它必须是数组 (用户有广告) 或 null (用户没有广告)
        if (Array.isArray(response.data.data) || response.data.data === null) {
            // 如果是数组，使用该数组；如果是 null，使用空数组 [] 表示没有广告
            ads.value = response.data.data || [];
            console.log("成功获取我的广告列表:", ads.value);
        } else {
            // 如果 response.data.data 存在但不是数组也不是 null
            error.value = `获取广告列表失败: 响应结构异常 - data字段类型错误 ${JSON.stringify(response.data)}`;
            console.error("获取广告列表失败: data字段类型错误", response.data);
        }
    } else {
        // 如果 response.data 根本不存在
        error.value = '获取广告列表失败: 未知响应结构';
        console.error("获取广告列表失败: 未知响应结构", response); // 打印完整的响应对象
    }

  } catch (err) {
    // 5. 处理错误
    console.error('获取我的广告请求失败:', err);

    if (err.response) {
      // 后端返回了错误响应
      if (err.response.status === 401) {
        // Token 无效或过期，清除 Token 并跳转到登录页
        error.value = '登录状态无效，请重新登录。';
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_info'); // 清除用户信息
        setTimeout(() => {
           router.push('/login');
        }, 2000);

      } else {
        error.value = `获取广告列表失败: ${err.response.data?.msg || err.response.data?.message || err.response.statusText}`;
      }
      console.error("获取我的广告失败响应:", err.response.data);

    } else if (err.request) {
      // 请求已发送但没有收到响应
      error.value = '获取广告列表失败: 未收到服务器响应 (网络错误)';
    } else {
      // 其他错误
      error.value = `获取广告列表失败: ${err.message}`;
    }

  } finally {
    // 无论成功或失败，请求完成后设置加载状态为 false
    isLoading.value = false;
  }
};

// 辅助函数：简单判断一个 URL 是否可能是图片
// 这不是一个严格的图片格式检查，只是一个简单的字符串判断
const isImageUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return false;
    }
    // 检查 URL 是否以常见的图片文件扩展名结尾 (不区分大小写)
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const lowerCaseUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerCaseUrl.endsWith(ext));
}


</script>

<style scoped>
h1 {
  color: blue; /* 临时加个样式方便区分 */
}

ul {
    list-style: none; /* 移除列表默认的圆点 */
    padding: 0;
}

li {
    border: 1px solid #eee; /* 添加边框 */
    margin-bottom: 15px; /* 底部间距 */
    padding: 15px; /* 内边距 */
    border-radius: 5px; /* 圆角 */
}

li h3 {
    margin-top: 0; /* 移除标题顶部外边距 */
    color: #333;
}

li p {
    margin-bottom: 5px; /* 段落底部间距 */
    color: #555;
    font-size: 0.9em;
}

img {
    border: 1px solid #ccc;
    padding: 5px;
    background-color: #fff;
    display: block; /* 让图片独占一行 */
}

a {
    color: #007bff;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

hr {
    border: none;
    border-top: 1px solid #eee;
    margin: 15px 0;
}
</style>
