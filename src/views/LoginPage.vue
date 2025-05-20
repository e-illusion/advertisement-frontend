<template>
  <div>
    <h1>登录页面</h1>

    <form @submit.prevent="handleLogin">
      <div>
        <label for="username">用户名:</label>
        <input type="text" id="username" v-model="username" required>
      </div>
      <div>
        <label for="password">密码:</label>
        <input type="password" id="password" v-model="password" required>
      </div>
      <button type="submit">登录</button>
    </form>

    <!-- 显示登录结果或错误信息 -->
    <p v-if="message">{{ message }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'; // 引入 ref 函数
import axios from 'axios'; // 引入 axios
import { useRouter } from 'vue-router'; // 引入 useRouter
import { useAuth } from '../composables/useAuth'; // 引入 useAuth 组合式函数 (稍后会创建或修改)

const router = useRouter(); // 获取路由器实例
const { checkAuthStatus } = useAuth(); // 使用 useAuth 组合式函数

// 创建响应式数据：用户名、密码和消息提示
const username = ref('');
const password = ref('');
const message = ref('');
const errorMessage = ref('');
const isLoading = ref('');

// 处理登录提交的方法
const handleLogin = async () => {
  message.value = ''; // 提交前清空之前的消息

  // 简单的输入校验
  if (!username.value || !password.value) {
    message.value = '用户名和密码不能为空';
    return;
  }

   try {
    const response = await axios.post('http://localhost:8080/login', {
      username: username.value,
      password: password.value,
    });

    // --- *** 关键修改：保存 Token 和用户信息 *** ---
    if (response.data && response.data.data && response.data.data.token) {
      const { token, id, username: loggedInUsername, role } = response.data.data; // 解构赋值获取 token, id, username, role

      localStorage.setItem('jwt_token', token);
      // 保存用户详细信息，包括 id 和 role，需要 JSON.stringify 因为 localStorage 只能存字符串
      localStorage.setItem('user_info', JSON.stringify({ id, username: loggedInUsername, role }));

      console.log("登录成功，Token 和用户信息已保存:", response.data.data);

      // 登录成功后，更新全局认证状态
      checkAuthStatus(); // 调用方法更新 App.vue 的状态

      // 重定向到用户主页或我的广告页面
      router.push('/my-ads'); // 或者您希望用户登录后跳转的页面
    } else {
      // 如果响应结构不符合预期
      errorMessage.value = `登录失败: 响应结构异常 ${JSON.stringify(response.data)}`;
       console.error("登录失败: 响应结构异常", response.data);
    }

  } catch (err) {
    // ... (错误处理逻辑不变) ...
    console.error('登录请求失败:', err);
     if (err.response) {
         if (err.response.data && err.response.data.error) {
             errorMessage.value = `登录失败: ${err.response.data.error}`;
         } else {
             errorMessage.value = `登录失败: ${err.response.statusText || '未知错误'}`;
         }
          console.error("登录失败响应:", err.response.data);
     } else if (err.request) {
         errorMessage.value = '登录失败: 未收到服务器响应 (网络错误)';
     } else {
         errorMessage.value = `登录失败: ${err.message}`;
     }
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* 您可以在这里添加登录页面的样式 */
/* scoped 确保样式只应用于当前组件 */
form div {
  margin-bottom: 15px;
}
label {
  display: inline-block;
  width: 80px; /* 固定 label 宽度，对齐表单 */
  text-align: right;
  margin-right: 10px;
}
input[type="text"], input[type="password"] {
   padding: 8px;
   border: 1px solid #ccc;
   border-radius: 4px;
}
button {
   padding: 10px 20px;
   background-color: #42b983; /* Vue 绿色 */
   color: white;
   border: none;
   border-radius: 4px;
   cursor: pointer;
   font-size: 16px;
}
 button:hover {
    background-color: #368b6b;
}
p {
    margin-top: 20px;
    color: red; /* 错误信息显示为红色 */
}
</style>
