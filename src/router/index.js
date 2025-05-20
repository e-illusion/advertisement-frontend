import { createRouter, createWebHistory } from 'vue-router';
import RegisterPage from '../views/RegisterPage.vue';
import LoginPage from '../views/LoginPage.vue';
import BalancePage from '../views/BalancePage.vue'; // 确保已导入 BalancePage
import MyAdsPage from '../views/MyAdsPage.vue'; // 确保路径正确
import CreateAdPage from '../views/CreateAdPage.vue';
import RequestCampaignPage from '../views/RequestCampaignPage.vue';
import { useAuth } from '../composables/useAuth'; // *** 关键：导入 useAuth
import AdminReviewPage from '../views/AdminReviewPage.vue'; // 确保路径正确
import MyCampaignsPage from '../views/MyCampaignsPage.vue'; // 确保路径正确
import InvoicePage from '../views/InvoicePage.vue'; // 确保路径正确
import PerformancePage from '../views/PerformancePage.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: '/login' // 根路径重定向到登录页
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterPage
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage
    },
    {
      path: '/balance',
      name: 'balance',
      component: BalancePage,
      // --- 添加 meta 字段，标记此路由需要认证 ---
      meta: {
        requiresAuth: true // 设置一个标识，表示这个页面需要登录
      }
    },
    // --- 添加我的广告页面路由 ---
    {
      path: '/my-ads', // URL 路径
      name: 'myAds', // 路由名称
      component: MyAdsPage, // 对应的组件
      meta: {
        requiresAuth: true // 这个页面需要登录
      }
    },
    // --- 添加发布广告页面路由 ---
    {
      path: '/create-ad', // URL 路径
      name: 'createAd', // 路由名称
      component: CreateAdPage, // 对应的组件
      meta: {
        requiresAuth: true // 这个页面需要登录
      }
    },
     // --- 添加请求广告活动页面路由 ---
    {
      path: '/request-campaign', // URL 路径
      name: 'requestCampaign', // 路由名称
      component: RequestCampaignPage, // 对应的组件
      meta: {
        requiresAuth: true // 这个页面需要登录
      }
    },
    // --- 添加管理员审核页面路由 ---
    {
      path: '/admin/reviews', // URL 路径
      name: 'adminReviews', // 路由名称
      component: AdminReviewPage, // 对应的组件
      meta: {
         requiresAuth: true, // 需要登录
         requiresAdmin: true // 需要是管理员
      }
    },
    // --- 添加用户活动管理页面路由 ---
    {
      path: '/my-campaigns', // URL 路径
      name: 'myCampaigns', // 路由名称
      component: MyCampaignsPage, // 对应的组件
      meta: {
         requiresAuth: true // 需要登录
         // 不需要 requiresAdmin
      }
    },
    // --- 添加发票页面路由 ---
    {
      path: '/invoices', // URL 路径
      name: 'invoices', // 路由名称
      component: InvoicePage, // 对应的组件
      meta: {
         requiresAuth: true // 需要登录
      }
    },
    // --- 添加广告数据展示页面 ---
    {
    path: '/performance',
    name: 'performance',
    component: PerformancePage,
    meta: { requiresAuth: true } // 这个页面需要认证
},
  ]
});

router.beforeEach((to, from, next) => {
  const { isAuthenticated, isAdmin, checkAuthStatus } = useAuth(); // 在守卫中获取状态

  // 确保状态是最新的（虽然 useAuth 模块加载时会运行一次，但这里再次调用确保最新状态）
  checkAuthStatus();

  const requiresAuth = to.meta.requiresAuth;
  const requiresAdmin = to.meta.requiresAdmin; // 获取是否需要管理员权限

  if (requiresAuth) {
    // 如果路由需要认证
    if (isAuthenticated.value) {
      // 已经认证
      if (requiresAdmin && !isAdmin.value) {
        // 如果需要管理员权限但当前用户不是管理员
        console.warn(`试图访问需要管理员权限的页面 (${to.path})，但用户不是管理员`);
        // 可以重定向到首页或一个提示没有权限的页面
        // next('/'); // 重定向到首页
        // 或者显示一个错误提示页面 (需要创建 NotFoundPage 或 UnauthorizedPage)
        // next({ name: 'unauthorized' });
        alert("您没有访问此页面的权限！"); // 简单提示
        next(false); // 停留在当前页面或前一个页面
      } else {
        // 已经认证且权限足够 (或不需要管理员权限)
        next(); // 继续导航
      }
    } else {
      // 需要认证但未认证，重定向到登录页
      console.log(`试图访问需要认证的页面 (${to.path})，重定向到登录页`);
      next({
        name: 'login',
        query: {
          redirect: to.fullPath
        }
      });
    }
  } else {
    // 路由不需要认证
    // 可选：如果已登录，访问 /login 或 /register 则重定向到首页
    // if (isAuthenticated.value && (to.name === 'login' || to.name === 'register')) {
    //    next('/');
    // } else {
    //    next(); // 继续导航
    // }
    next(); // 继续导航
  }
});

export default router;
