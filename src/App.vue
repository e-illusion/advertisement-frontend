<template>
  <div>
    <header>
      <nav>
        <template v-if="!isAuthenticated">
          <router-link to="/register">注册</router-link> |
          <router-link to="/login">登录</router-link>
        </template>

        <!-- 已登录状态显示的链接 -->
        <template v-else>
          <router-link to="/balance">余额 / 充值</router-link> |
          <router-link to="/my-ads">我的广告</router-link> |
          <router-link to="/my-campaigns">我的活动</router-link> |
          <router-link to="/create-ad">创建广告</router-link> |
          <router-link to="/request-campaign">创建活动</router-link> |
          <router-link to="/invoices">我的发票</router-link> |
          <router-link to="/performance">广告效果</router-link>
          <template v-if="isAdmin">
             | <router-link to="/admin/reviews">审核列表</router-link>
          </template>
          | <a href="#" @click.prevent="handleLogout">退出</a>
        </template>
      </nav>
    </header>
    <router-view />
  </div>
</template>

<script setup>

import { onMounted, watch } from 'vue'; // 引入 watch
import { useRouter, useRoute } from 'vue-router'; // 引入 useRoute
import { useAuth } from './composables/useAuth'; // 引入 useAuth 组合式函数

const router = useRouter(); // 获取路由器实例
const route = useRoute();   // 获取当前路由对象实例

// 创建一个响应式变量来跟踪用户的登录状态
const { isAuthenticated, isAdmin, checkAuthStatus } = useAuth();

// 在组件“挂载”时执行，用于初始化登录状态显示
onMounted(() => {
  console.log("App Mounted, Checking auth status...");
  checkAuthStatus(); // 初始化时检查认证状态
});

watch(route, (newRoute, oldRoute) => {
   console.log(`路由变化: 从 ${oldRoute.path} 到 ${newRoute.path}, Checking auth status...`);
   checkAuthStatus(); // 路由变化时也检查认证状态
});

const handleLogout = () => {
  console.log('用户执行退出操作');
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user_info'); // *** 关键修改：退出时也移除 user_info ***
  // 退出后更新状态
  checkAuthStatus(); // 调用方法更新状态
  router.push('/login');
};
</script>

<style scoped>
header {
  line-height: 1.5;
  /* max-height: 100vh; */ /* 根据需要调整 */
}

nav {
  width: 100%;
  font-size: 14px; /* 稍微调大字体 */
  text-align: center;
  margin-top: 1rem; /* 调整顶部外边距 */
  padding-bottom: 1rem; /* 底部内边距，和 router-view 稍微隔开 */
  border-bottom: 1px solid #eee; /* 添加一个底部边框 */
}

nav a.router-link-exact-active {
  color: #42b983; /* Vue 绿色，高亮当前路由链接 */
  font-weight: bold; /* 加粗当前路由链接 */
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid #eee; /* 添加左侧分割线 */
  text-decoration: none; /* 移除下划线 */
  color: #2c3e50; /* 默认字体颜色 */
}

nav a:first-of-type {
  border: 0; /* 第一个链接没有左侧边框 */
}

nav a:hover {
    color: #42b983; /* 鼠标悬停颜色 */
}
</style>
