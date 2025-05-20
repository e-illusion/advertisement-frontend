// src/composables/useAuth.js
import { ref, readonly } from 'vue';

// 定义全局共享的认证状态和管理员状态
const isAuthenticated = ref(false);
const isAdmin = ref(false);

// checkAuthStatus 函数用于从 localStorage 读取状态并更新响应式变量
const checkAuthStatus = () => {
  console.log("useAuth: Checking auth status...");
  const token = localStorage.getItem('jwt_token');
  const userInfoString = localStorage.getItem('user_info');

  // 更新 isAuthenticated
  const authenticated = token !== null;
  if (isAuthenticated.value !== authenticated) {
    isAuthenticated.value = authenticated;
    console.log("useAuth: isAuthenticated updated to", isAuthenticated.value);
  }

  // 更新 isAdmin
  let admin = false;
  if (userInfoString) {
    try {
      const userInfo = JSON.parse(userInfoString);
      // 检查解析出的 user_info 对象中是否存在 role 字段且其值为 "admin"
      // 根据您提供的后端修改，role 字段是直接在 data 下的
      // 如果您的后端返回的是 user_info 嵌套对象，上面的 LoginPage 修改需要对应调整
      // 但根据您提供的最终LoginHandler代码，是 data.id, data.username, data.role
      // 所以这里需要从 localStorage 拿到的 user_info string 是包含 role 的
      if (userInfo && userInfo.role === 'admin') {
         admin = true;
      }
      console.log("useAuth: user_info parsed:", userInfo);
      console.log("useAuth: user role is", userInfo ? userInfo.role : 'none');

    } catch (e) {
      console.error("useAuth: Failed to parse user_info from localStorage", e);
      // 解析失败，可能数据损坏，清理一下 localStorage
      localStorage.removeItem('user_info');
      admin = false; // 解析失败则不是管理员
    }
  }

  if (isAdmin.value !== admin) {
     isAdmin.value = admin;
     console.log("useAuth: isAdmin updated to", isAdmin.value);
  }
};

// 导出状态和检查函数，使用 readonly 确保状态不能在组件中直接修改
export function useAuth() {
  return {
    isAuthenticated: readonly(isAuthenticated), // 导出为只读
    isAdmin: readonly(isAdmin), // 导出为只读
    checkAuthStatus,
  };
}

// 在模块加载时立即执行一次 checkAuthStatus，以便初始化状态
checkAuthStatus();
