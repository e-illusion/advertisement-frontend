<template>
  <div>
    <h1>注册页面</h1>

    <form @submit.prevent="handleRegister">
      <div>
        <label for="username">用户名:</label>
        <input type="text" id="username" v-model="username" required>
      </div>
      <div>
        <label for="password">密码:</label>
        <input type="password" id="password" v-model="password" required>
      </div>
      <button type="submit">注册</button>
    </form>

    <!-- 显示注册结果或错误信息 -->
    <p v-if="message">{{ message }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'; // 引入 ref 函数，用于创建响应式数据
import axios from 'axios'; // 引入 axios，用于发送 HTTP 请求
import { useRouter } from 'vue-router'; // 引入 useRouter，用于路由跳转

// 创建响应式数据：用户名、密码和消息提示
const username = ref('');
const password = ref('');
const message = ref('');

const router = useRouter(); // 获取路由器实例

// 处理注册提交的方法
const handleRegister = async () => {
  message.value = ''; // 提交前清空之前的消息

  // 简单的输入校验
  if (!username.value || !password.value) {
    message.value = '用户名和密码不能为空';
    return;
  }

  try {
    const response = await axios.post('http://localhost:8080/register', {
      username: username.value,
      password: password.value
    });

    // --- 修改这里的成功判断逻辑 ---
    // 根据后端返回的 {"message": "注册成功"} 结构来判断
    // 如果 response.data 存在且 message 字段存在，我们就认为是成功
    if (response.data && response.data.message) {
        // 我们可以进一步检查 message 的具体内容，但仅判断存在通常够了
        // 暂时先不检查 message 的具体内容，只判断 response.data.message 存在
          message.value = response.data.message + '！即将跳转到登录页...'; // 使用后端返回的成功消息
          console.log("注册成功响应:", response.data); // 打印成功响应到控制台

          // 注册成功后，延迟一段时间跳转到登录页
          setTimeout(() => {
            router.push('/login');
          }, 2000); // 2秒后跳转

    } else {
      // 如果 response.data 不存在或者没有 message 字段，认为是未知错误
      message.value = '注册失败: 未知响应结构';
      console.error("注册失败: 未知响应结构", response); // 打印完整的响应对象
    }

  } catch (error) {
    console.error('注册请求失败:', error);
    if (error.response) {
        // 后端返回了错误响应 (例如 409 Conflict)
        // 尝试显示后端返回的 msg 字段 (如果有的话，虽然注册成功响应没有)，
        // 或者使用 error.response.data 中可能的错误信息，
        // 或者回退到状态文本
        message.value = `注册失败: ${error.response.data?.msg || error.response.data?.message || error.response.statusText}`;
        console.error("注册失败响应:", error.response.data); // 打印失败响应数据
    } else if (error.request) {
        message.value = '注册失败: 未收到服务器响应 (网络错误)';
    } else {
        message.value = `注册失败: ${error.message}`;
    }
  }
};
</script>

<style scoped>
/* 您可以在这里添加注册页面的样式 */
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
