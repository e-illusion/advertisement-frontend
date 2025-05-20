<template>
  <div>
    <h1>我的余额</h1>

    <!-- 如果正在加载余额，显示加载中 -->
    <p v-if="isLoadingBalance">加载余额中...</p>

    <!-- 如果有余额加载错误信息，显示错误 -->
    <p v-else-if="errorBalance" style="color: red;">错误: {{ errorBalance }}</p>

    <!-- 如果余额已加载且不为 null (初始值)，显示余额 -->
    <div v-else-if="balance !== null">
      <!-- 格式化显示两位小数，使用动态 currency -->
      <p>当前余额: <strong>{{ balance.toFixed(2) }}</strong> {{ currency }}</p>
    </div>

    <!-- 初始状态或未加载余额 -->
    <p v-else>点击导航或刷新页面查看余额</p>

    <hr> <!-- 分隔线 -->

    <!-- 充值表单 -->
    <h2>充值</h2>
    <div>
      <label for="rechargeAmount">充值金额 (元):</label>
      <!-- 允许输入小数 -->
      <input type="number" id="rechargeAmount" v-model.number="rechargeAmount" :disabled="isRecharging" min="0.01" step="0.01">
      <button @click="handleRecharge" :disabled="isRecharging">
        {{ isRecharging ? '充值中...' : '提交充值' }}
      </button>
    </div>
     <!-- 充值操作结果提示 -->
    <p v-if="rechargeMessage" style="color: green;">{{ rechargeMessage }}</p>
    <p v-if="rechargeError" style="color: red;">{{ rechargeError }}</p>

    <hr> <!-- 分隔线 -->

    <!-- 充值历史 -->
    <h2>充值记录</h2>

    <!-- 筛选表单 -->
    <div class="filter-form">
        <h3>筛选记录</h3>
        <label for="filterStatus">状态:</label>
        <select id="filterStatus" v-model="filterStatus">
            <option value="">所有状态</option>
            <option value="Success">成功</option>
            <option value="Failed">失败</option>
            <option value="Pending">待处理</option>
        </select>

        <label for="filterMinAmount">最小金额 (元):</label>
        <input type="number" id="filterMinAmount" v-model.number="filterMinAmount" min="0">

        <label for="filterMaxAmount">最大金额 (元):</label>
        <input type="number" id="filterMaxAmount" v-model.number="filterMaxAmount" min="0">

         <label for="filterStartDate">开始日期:</label>
         <input type="date" id="filterStartDate" v-model="filterStartDate">

         <label for="filterEndDate">结束日期:</label>
         <input type="date" id="filterEndDate" v-model="filterEndDate">

        <button @click="fetchRechargeHistory">应用筛选</button>
        <button @click="resetFilters">重置筛选</button>
    </div>


    <!-- 充值历史列表 -->
    <p v-if="isLoadingHistory">加载充值记录中...</p>
    <p v-else-if="errorHistory" style="color: red;">加载充值记录失败: {{ errorHistory }}</p>
    <!-- 当不加载、没有错误且记录为空时显示 -->
    <p v-else-if="rechargeHistory.length === 0">没有充值记录。</p>
    <ul v-else class="history-list">
        <li v-for="record in rechargeHistory" :key="record.id" class="history-item">
            <!-- record.amount 应该是分，需要 / 100.0 转换为元 -->
            <strong>ID:</strong> {{ record.id }} <br>
            <strong>金额:</strong> {{ (record.amount / 100.0).toFixed(2) }} {{ currency }} <br>
            <strong>状态:</strong> {{ record.status }} <br>
            <strong>支付方式:</strong> {{ record.payment_method }} <br>
            <strong>交易号:</strong> {{ record.transaction_id || 'N/A' }} <br>
            <strong>时间:</strong> {{ formatDateTime(record.created_at) }} <br>
        </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useAuth } from '../composables/useAuth'; // 引入 useAuth

const { checkAuthStatus } = useAuth(); // 获取 checkAuthStatus 用于处理 401 错误

// --- 余额相关数据 ---
const balance = ref(null);
const currency = ref('CNY'); // 初始化一个默认货币单位
const isLoadingBalance = ref(false); // 区分余额和历史的加载状态
const errorBalance = ref(null);       // 区分余额和历史的错误信息

// --- 充值表单相关数据 ---
const rechargeAmount = ref(null); // 充值金额，使用 null 或 0 初始化
const isRecharging = ref(false);  // 充值操作加载状态
const rechargeMessage = ref(null); // 充值成功消息
const rechargeError = ref(null);   // 充值失败错误

// --- 充值历史相关数据 ---
const rechargeHistory = ref([]);
const isLoadingHistory = ref(false); // 充值历史加载状态
const errorHistory = ref(null);      // 充值历史错误信息

// --- 充值历史筛选条件 ---
const filterStatus = ref(''); // 绑定到状态选择框
const filterMinAmount = ref(null); // 绑定到最小金额输入框 (元)
const filterMaxAmount = ref(null); // 绑定到最大金额输入框 (元)
const filterStartDate = ref(null); // 绑定到开始日期输入框 (YYYY-MM-DD 字符串)
const filterEndDate = ref(null);   // 绑定到结束日期输入框 (YYYY-MM-DD 字符串)


// --- 数据获取函数 ---

// 获取用户余额
const fetchBalance = async () => {
  isLoadingBalance.value = true;
  errorBalance.value = null;
  const token = localStorage.getItem('jwt_token');

  if (!token) {
     errorBalance.value = '未认证，无法加载余额';
     isLoadingBalance.value = false;
     //checkAuthStatus(); // useAuth 内部会检查并重定向
     return;
  }

  try {
    const response = await axios.get('http://localhost:8080/balance', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // 根据您的后端 webutil.Response 结构，数据在 response.data.data 中
    if (response.data && response.data.data) {
        // 后端 Balance 和 Currency 字段在 JSON 中是小写 balance 和 currency
        // 并且 Balance 字段是分，需要除以 100.0
        balance.value = response.data.data.balance / 100.0;
        currency.value = response.data.data.currency;
        console.log("获取余额成功:", response.data.data); // 打印后端 Data 的内容
    } else {
        // 即使后端返回成功状态码，但 data 结构不符合预期
       errorBalance.value = `获取余额失败: 响应结构异常 ${JSON.stringify(response.data)}`;
       console.error("获取余额失败: 响应结构异常", response.data);
    }

  } catch (err) {
    console.error('获取余额请求失败:', err);
     if (err.response) {
      if (err.response.status === 401 || err.response.status === 403) {
        errorBalance.value = '登录状态无效，请重新登录。';
        // 可以在这里或通过 useAuth 路由守卫处理重定向
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_info');
        // setTimeout(() => { router.push('/login'); }, 2000); // 避免多次重定向，交给 useAuth 处理
        checkAuthStatus(); // 触发 useAuth 检查，它会处理重定向
      } else {
         // 尝试从后端错误响应中获取错误信息
        errorBalance.value = `获取余额失败: ${err.response.data?.error || err.response.data?.msg || err.response.statusText || '未知错误'}`;
      }
      console.error("获取余额失败响应:", err.response.data);
    } else if (err.request) {
      errorBalance.value = '获取余额失败: 未收到服务器响应 (网络错误)';
    } else {
      errorBalance.value = `获取余额失败: ${err.message || '未知错误'}`;
    }
  } finally {
    isLoadingBalance.value = false;
  }
};

// 获取充值历史
const fetchRechargeHistory = async () => {
  isLoadingHistory.value = true;
  errorHistory.value = null;
  const token = localStorage.getItem('jwt_token');

   if (!token) {
     errorHistory.value = '未认证，无法加载充值记录';
     isLoadingHistory.value = false;
     // checkAuthStatus(); // useAuth 内部会检查并重定向
     return;
  }

  try {
    // 构建查询参数
    const params = new URLSearchParams();
    if (filterStatus.value) {
        params.append('status', filterStatus.value);
    }
    // 前端金额输入是元，后端API GetRechargeHistoryHandler 接收 min_amount/max_amount 也是元，不需要前端转换
    if (filterMinAmount.value !== null && filterMinAmount.value >= 0) {
        params.append('min_amount', filterMinAmount.value.toString());
    }
     if (filterMaxAmount.value !== null && filterMaxAmount.value >= 0) {
        params.append('max_amount', filterMaxAmount.value.toString());
    }
    // 日期输入框通常返回 YYYY-MM-DD 格式字符串，符合后端要求
    if (filterStartDate.value) {
        params.append('start_date', filterStartDate.value);
    }
    if (filterEndDate.value) {
        params.append('end_date', filterEndDate.value);
    }

    // 发送 GET 请求到 /recharges 接口
    const response = await axios.get(`http://localhost:8080/recharges?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // 检查 response.data 是否存在，以及 response.data.data 字段是否存在
    if (response.data && response.data.data !== undefined) {
      // 即使 data 是 null 或 [] 空数组，都表示成功获取到数据（只是没记录）
      if (Array.isArray(response.data.data)) {
           rechargeHistory.value = response.data.data; // 如果是数组，直接赋值
           console.log("充值记录加载成功:", rechargeHistory.value);
      } else if (response.data.data === null) {
           rechargeHistory.value = []; // 如果 data 是 null，视为没有记录，赋值空数组
           console.log("充值记录加载成功: 没有找到记录 (后端返回 null)", response.data);
      } else {
          // data 字段存在但不是数组也不是 null，这才是响应结构异常
          errorHistory.value = `加载充值记录失败: 响应结构异常 - data字段类型错误 ${JSON.stringify(response.data)}`;
          console.error("加载充值记录失败: 响应结构异常 - data字段类型错误", response.data);
      }
    } else {
       // response.data 或 response.data.data 不存在，响应结构异常
       errorHistory.value = `加载充值记录失败: 响应结构异常 - 缺少data字段 ${JSON.stringify(response.data)}`;
       console.error("加载充值记录失败: 响应结构异常 - 缺少data字段", response.data);
    }

  } catch (err) {
    console.error('获取充值记录请求失败:', err);
     if (err.response) {
         if (err.response.status === 401 || err.response.status === 403) {
             // 路由守卫或 useAuth 已处理重定向
             checkAuthStatus();
         } else {
             // 尝试从后端错误响应中获取错误信息
              errorHistory.value = `加载充值记录失败: ${err.response.data?.error || err.response.data?.msg || err.response.statusText || '未知错误'}`;
         }
         console.error("加载充值记录失败响应:", err.response.data);
     } else if (err.request) {
         errorHistory.value = '加载充值记录失败: 未收到服务器响应 (网络错误)';
     } else {
         errorHistory.value = `加载充值记录失败: ${err.message || '未知错误'}`;
     }
  } finally {
    isLoadingHistory.value = false;
  }
};


// 处理充值请求
const handleRecharge = async () => {
    rechargeMessage.value = null; // 清空之前的消息
    rechargeError.value = null;
    isRecharging.value = true; // 开始充值，设置加载状态

    // 1. 验证金额输入
    // 使用 parseFloat 确保正确处理小数，并检查是否为有效数字
    const amountValue = parseFloat(rechargeAmount.value);
    if (isNaN(amountValue) || amountValue <= 0) {
        rechargeError.value = "请输入有效的充值金额 (大于 0)";
        isRecharging.value = false;
        return;
    }

    // 2. 获取 Token
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        rechargeError.value = '您尚未登录，无法进行充值。';
        isRecharging.value = false;
        // checkAuthStatus(); // useAuth 内部会检查并重定向
        return;
    }

    try {
        // 3. 发送 POST 请求到 /recharge 接口
        // 后端接收的请求体是 {"amount": 100.50}，前端发送浮点数金额 (元) 是正确的
        const response = await axios.post('http://localhost:8080/recharge', {
            amount: amountValue // 发送 parseFloat 后的金额 (元)
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // 4. 处理后端响应
        // 假设后端成功时返回 {"code": 0, "message": "充值成功！", "data": {"transaction_id": "..."}}
        // 检查 response.data.message (小写 m)
        if (response.data && response.data.message) {
             rechargeMessage.value = response.data.message; // 使用小写 message
             console.log("充值请求成功:", response.data);
             // 清空输入框
             rechargeAmount.value = null;
             // 充值成功后，刷新余额和充值记录列表
             setTimeout(fetchBalance, 500); // 延迟刷新余额，给后端处理时间
             setTimeout(fetchRechargeHistory, 500); // 延迟刷新历史

        } else {
            // 响应结构不符合预期，即使状态码是 2xx
             rechargeError.value = `充值失败: 响应结构异常或缺少消息 ${JSON.stringify(response.data)}`;
             console.error("充值失败: 响应结构异常", response.data);
        }

    } catch (err) {
        // 5. 处理错误
        console.error('充值请求失败:', err);
        if (err.response) {
             if (err.response.status === 401 || err.response.status === 403) {
                 rechargeError.value = '登录状态无效或无权限，请重新登录。';
                 // localStorage.removeItem('jwt_token'); // useAuth 内部会清理
                 // localStorage.removeItem('user_info'); // useAuth 内部会清理
                 // setTimeout(() => { router.push('/login'); }, 2000); // 避免多次重定向，交给 useAuth 处理
                 checkAuthStatus(); // 触发 useAuth 检查，它会处理重定向
            } else {
                // 尝试从后端错误响应中获取错误信息
                 rechargeError.value = `充值失败: ${err.response.data?.error || err.response.data?.msg || err.response.statusText || '未知错误'}`;
             }
            console.error("充值失败响应:", err.response.data);
        } else if (err.request) {
             rechargeError.value = '充值失败: 未收到服务器响应 (网络错误)';
        } else {
             rechargeError.value = `充值失败: ${err.message || '未知错误'}`;
        }
    } finally {
        isRecharging.value = false; // 结束充值加载状态
    }
};

// 重置筛选条件
const resetFilters = () => {
    filterStatus.value = '';
    filterMinAmount.value = null;
    filterMaxAmount.value = null;
    filterStartDate.value = null;
    filterEndDate.value = null;
    // 重置后自动刷新列表
    fetchRechargeHistory();
};

// 辅助函数：格式化日期时间
const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
        const date = new Date(dateTimeString);
         // 检查日期是否有效，防止 Invalid Date
         if (!isNaN(date.getTime())) {
             // 使用浏览器本地格式，或者自定义格式
             const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
             // 可选：如果 dateTimeString 是 UTC 时间 (带 Z)，toLocaleTimeString 可能需要 options.timeZone: 'UTC' 或其他处理
             // 简单起见，先使用默认的本地时间格式
             return new Intl.DateTimeFormat('zh-CN', options).format(date);
        }
    } catch (e) {
        console.error("日期时间格式化错误:", dateTimeString, e);
    }
    return dateTimeString; // 格式化失败返回原始字符串
};


// --- 生命周期钩子 ---
onMounted(() => {
  console.log("BalancePage Mounted, Fetching balance and history...");
  fetchBalance(); // 页面加载后立即获取余额
  fetchRechargeHistory(); // 页面加载后立即获取充值历史 (无筛选条件)
});

</script>

<style scoped>
/* 您可以在这里添加余额和充值页面的样式 */
h1 {
  color: purple;
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
    /* 防止换行导致布局混乱 */
    white-space: nowrap;
}
.filter-form label:first-child {
     margin-left: 0;
}

.filter-form input[type="number"],
.filter-form input[type="date"],
.filter-form select {
    margin-right: 10px;
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 4px;
     /* 确保在小屏幕上不超出 */
     max-width: 150px;
}

.filter-form button {
     padding: 5px 10px;
     cursor: pointer;
     border: none;
     border-radius: 4px;
     margin-right: 5px;
     /* 确保按钮之间有间隔 */
     margin-bottom: 5px;
}
.filter-form button:last-child {
     margin-right: 0;
}

/* 针对筛选表单内部元素的flex或grid布局，使其在小屏幕上换行更友好 */
.filter-form div {
    display: flex; /* 或 grid */
    flex-wrap: wrap; /* 允许换行 */
    align-items: center;
    gap: 10px; /* 元素之间的间距 */
}


.history-list {
  list-style: none;
  padding: 0;
}

.history-item {
  border: 1px solid #ccc;
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 5px;
  background-color: #fff;
}

.history-item strong {
    display: inline-block; /* 让标题独占一行或有固定宽度 */
    width: 80px; /* 根据需要调整宽度 */
    text-align: right;
    margin-right: 5px;
    vertical-align: top; /* 标题顶部对齐 */
}
</style>
