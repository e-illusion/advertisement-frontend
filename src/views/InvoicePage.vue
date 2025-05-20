<template>
  <div>
    <h1>我的发票</h1>

    <hr> <!-- 分隔线 -->

    <!-- 发票请求表单 -->
    <h2>提交开票请求</h2>
    <div class="request-form">
        <p>请选择需要开具发票的充值时间范围，并填写开票信息。</p>
        <p>系统将根据您在此时间范围内 **成功充值** 的总金额开具发票。</p>

        <div class="form-group">
            <label for="invoicePeriodStartDate">充值开始日期:</label>
            <input type="date" id="invoicePeriodStartDate" v-model="invoicePeriodStartDate" required>
        </div>

        <div class="form-group">
            <label for="invoicePeriodEndDate">充值结束日期:</label>
            <input type="date" id="invoicePeriodEndDate" v-model="invoicePeriodEndDate" required>
        </div>

        <div class="form-group">
            <label for="billingTitle">发票抬头:</label>
            <input type="text" id="billingTitle" v-model="billingTitle" required placeholder="公司名称或个人姓名">
        </div>

        <div class="form-group">
            <label for="taxId">税务识别号 (可选):</label>
            <!-- NOTE: Backend payload expects key "taxIdOmitempty" based on your struct definition -->
            <input type="text" id="taxId" v-model="taxId" placeholder="统一社会信用代码/身份证号">
        </div>

         <div class="form-group">
            <label for="billingAddress">邮寄地址/邮箱:</label>
            <!-- 后端 BillingAddress 字段用于邮寄地址或电子发票的邮箱 -->
            <input type="text" id="billingAddress" v-model="billingAddress" required placeholder="邮寄地址或接收电子发票的邮箱">
        </div>

        <button @click="handleRequestInvoice" :disabled="isSubmittingRequest || !invoicePeriodStartDate || !invoicePeriodEndDate || !billingTitle || !billingAddress">
           {{ isSubmittingRequest ? '提交中...' : '提交请求' }}
        </button>

         <!-- 请求操作结果提示 -->
        <p v-if="requestMessage" style="color: green; margin-top: 10px;">{{ requestMessage }}</p>
        <p v-if="requestError" style="color: red; margin-top: 10px;">{{ requestError }}</p>
    </div>

    <hr> <!-- 分隔线 -->

    <!-- 发票历史列表 -->
    <h2>发票请求记录</h2>

     <!-- 如果正在加载历史，显示加载中 -->
    <p v-if="isLoadingHistory">加载发票记录中...</p>

    <!-- 如果有历史加载错误信息，显示错误 -->
    <p v-else-if="errorHistory" style="color: red;">加载发票记录失败: {{ errorHistory }}</p>

    <!-- 筛选表单 (只在加载完成后且没有错误时显示) -->
    <div class="filter-form" v-else>
        <h3>筛选记录</h3>
        <label for="filterStatus">状态:</label>
        <select id="filterStatus" v-model="filterStatus">
            <option value="">所有状态</option>
            <!-- 根据后端支持的状态添加选项 -->
            <option value="Pending">待处理</option>
            <option value="Approved">已批准/开票中</option>
            <option value="Completed">已完成</option>
            <option value="Rejected">已拒绝</option>
            <option value="Cancelled">已取消</option> <!-- 如果后端支持取消 -->
        </select>

         <label for="filterRequestStartDate">请求开始日期:</label>
         <input type="date" id="filterRequestStartDate" v-model="filterRequestStartDate">

         <label for="filterRequestEndDate">请求结束日期:</label>
         <input type="date" id="filterRequestEndDate" v-model="filterRequestEndDate">

        <button @click="fetchUserInvoices">应用筛选</button>
        <button @click="resetFilters">重置筛选</button>
    </div>


    <!-- 发票历史列表 -->
    <p v-if="!isLoadingHistory && !errorHistory && invoices.length === 0">没有找到发票记录。</p>
    <ul v-else-if="!isLoadingHistory && !errorHistory" class="invoice-list">
        <li v-for="invoice in invoices" :key="invoice.id" class="invoice-item">
            <strong>请求 ID:</strong> {{ invoice.id }} <br>
            <strong>开票金额:</strong> {{ formatCurrency(invoice.total_amount) }} <br> <!-- 分转元 -->
            <strong>开票抬头:</strong> {{ invoice.billing_title }} <br>
            <strong>税号:</strong> {{ invoice.tax_id || 'N/A' }} <br> <!-- 显示税号，如果没有则显示 N/A -->
             <strong>地址/邮箱:</strong> {{ invoice.billing_address }} <br>
            <strong>开票周期:</strong> {{ formatDate(invoice.invoice_period_start) }} 至 {{ formatDate(invoice.invoice_period_end) }} <br>
            <strong>请求时间:</strong> {{ formatDateTime(invoice.requested_at) }} <br>
             <strong>状态:</strong> <span :class="'status-' + invoice.status.toLowerCase()">{{ invoice.status }}</span> <br>
            <!-- 可以根据需要显示更多详情，例如拒绝原因、开票链接等 -->
             <div v-if="invoice.status === 'Rejected' && invoice.admin_comment">
                 <strong>管理员备注:</strong> {{ invoice.admin_comment }}
            </div>
             <!-- 详情按钮 (如果需要独立详情页) -->
             <!-- <router-link :to="'/invoices/' + invoice.id">查看详情</router-link> -->
        </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useAuth } from '../composables/useAuth'; // 引入 useAuth

const { checkAuthStatus } = useAuth(); // 获取 checkAuthStatus 用于处理 401 错误

// --- 发票请求表单数据 ---
const invoicePeriodStartDate = ref(null); // 充值周期开始日期
const invoicePeriodEndDate = ref(null);   // 充值周期结束日期
const billingTitle = ref('');             // 发票抬头
const taxId = ref('');                    // 税务识别号
const billingAddress = ref('');           // 邮寄地址/邮箱
const isSubmittingRequest = ref(false); // 提交请求加载状态
const requestMessage = ref(null);       // 提交请求成功消息
const requestError = ref(null);         // 提交请求失败错误

// --- 发票历史列表数据 ---
const invoices = ref([]);
const isLoadingHistory = ref(false); // 历史列表加载状态
const errorHistory = ref(null);      // 历史列表错误信息

// --- 发票历史筛选条件 ---
const filterStatus = ref(''); // 绑定到状态选择框
const filterRequestStartDate = ref(null); // 绑定到请求开始日期输入框 (YYYY-MM-DD 字符串)
const filterRequestEndDate = ref(null);   // 绑定到请求结束日期输入框 (YYYY-MM-DD 字符串)


// --- 数据获取函数 ---

// 获取用户发票请求历史
const fetchUserInvoices = async () => {
  isLoadingHistory.value = true;
  errorHistory.value = null;
  const token = localStorage.getItem('jwt_token');

   if (!token) {
     errorHistory.value = '未认证，无法加载发票记录';
     isLoadingHistory.value = false;
      checkAuthStatus(); // 更新认证状态
     return;
  }

  try {
    // 构建查询参数 (按请求日期和状态筛选)
    const params = new URLSearchParams();
    if (filterStatus.value) {
        params.append('status', filterStatus.value);
    }
    // 日期输入框通常返回 YYYY-MM-DD 格式字符串，符合后端要求
    if (filterRequestStartDate.value) {
        params.append('start_date', filterRequestStartDate.value); // 后端是按请求日期过滤的
    }
    if (filterRequestEndDate.value) {
        params.append('end_date', filterRequestEndDate.value);   // 后端是按请求日期过滤的
    }

    // 发送 GET 请求到 /invoices 接口
    const response = await axios.get(`http://localhost:8080/invoices?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.data && Array.isArray(response.data.data)) {
      invoices.value = response.data.data; // 获取发票记录列表
      console.log("用户发票记录加载成功:", invoices.value);
    } else {
        // 如果响应成功但结构不符合预期
        errorHistory.value = `加载发票记录失败: 响应结构异常 ${JSON.stringify(response.data)}`;
        console.error("加载发票记录失败: 响应结构异常", response.data);
    }

  } catch (err) {
    console.error('获取用户发票记录请求失败:', err);
     if (err.response) {
         if (err.response.status === 401 || err.response.status === 403) {
             errorHistory.value = '您没有权限访问此页面或登录已失效。';
             checkAuthStatus(); // 更新认证状态，可能重定向
         } else if (err.response.data) {
             // 优先检查 'error', 然后是 'message', 最后是 'msg'
             if (err.response.data.error) {
                 errorHistory.value = `加载发票记录失败: ${err.response.data.error}`;
             } else if (err.response.data.message) { // 根据用户反馈，成功消息用 message
                 errorHistory.value = `加载发票记录失败: ${err.response.data.message}`; // 错误也可能用 message
             } else if (err.response.data.msg) { // 保留 msg 作为可能的 fallback
                  errorHistory.value = `加载发票记录失败: ${err.response.data.msg}`;
             }
              else {
                 errorHistory.value = `加载发票记录失败: 服务器返回未知错误结构`;
             }
             console.error("加载发票记录失败响应:", err.response.data);
         } else { // err.response exists but no data field
              errorHistory.value = `加载发票记录失败: ${err.response.statusText || '未知错误'}`;
         }
     } else if (err.request) {
         errorHistory.value = '加载发票记录失败: 未收到服务器响应 (网络错误)';
     } else {
         errorHistory.value = `加载发票记录失败: ${err.message}`;
     }
  } finally {
    isLoadingHistory.value = false;
  }
};

// 处理发票请求提交 (新增)
const handleRequestInvoice = async () => {
    requestMessage.value = null; // 清空之前的消息
    requestError.value = null;

    // 客户端简单验证
    if (!invoicePeriodStartDate.value || !invoicePeriodEndDate.value || !billingTitle.value || !billingAddress.value) {
        requestError.value = "请填写所有必填项（充值日期范围、发票抬头、邮寄地址/邮箱）";
        return;
    }
    // 日期顺序验证
    if (new Date(invoicePeriodEndDate.value) < new Date(invoicePeriodStartDate.value)) {
        requestError.value = "结束日期不能早于开始日期";
        return;
    }


    isSubmittingRequest.value = true; // 开始提交，设置加载状态

    const token = localStorage.getItem('jwt_token');
    if (!token) {
        requestError.value = '您尚未登录，无法提交发票请求。';
        isSubmittingRequest.value = false;
        checkAuthStatus(); // 更新认证状态
        return;
    }

    try {
        const payload = {
             // Frontend v-model binds date strings directly (YYYY-MM-DD)
            startDate: invoicePeriodStartDate.value, // 对应后端 payload 的 startDate
            endDate: invoicePeriodEndDate.value,   // 对应后端 payload 的 endDate
            billingTitle: billingTitle.value,      // 对应后端 payload 的 billingTitle
            // IMPORTANT: Based on your backend struct InvoiceRequestPayload,
            // the JSON key for TaxID is "taxIdOmitempty"
            taxIdOmitempty: taxId.value,           // 对应后端 payload 的 taxIdOmitempty
            billingAddress: billingAddress.value,  // 对应后端 payload 的 billingAddress
        };
        console.log("Submitting invoice request with payload:", payload); // 打印发送的 payload

        // 发送 POST 请求到 /invoices/request 接口
        const response = await axios.post('http://localhost:8080/invoices/request', payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.message) { // 检查 "message" 字段
             requestMessage.value = response.data.message; // 使用 "message" 字段的值
             console.log("发票请求成功:", response.data);
             // 清空表单 (可选)
             invoicePeriodStartDate.value = null;
             invoicePeriodEndDate.value = null;
             billingTitle.value = '';
             taxId.value = '';
             billingAddress.value = '';

             // 提交成功后，刷新历史记录列表
             setTimeout(fetchUserInvoices, 500); // 延迟刷新

        } else {
             requestError.value = `提交发票请求成功，但服务器返回的响应结构异常。完整响应: ${JSON.stringify(response.data)}`;
             console.warn("提交发票请求成功，但响应结构异常:", response.data);
        }

    } catch (err) {
        // 处理错误，axios 会在非 2xx 状态码时抛出错误
        console.error('提交发票请求失败:', err);
        if (err.response) {
             if (err.response.status === 401 || err.response.status === 403) {
                 requestError.value = '登录状态无效或无权提交请求，请重新登录。';
                 checkAuthStatus(); // 更新认证状态，可能重定向
            } else if (err.response.data) {
                 // 优先检查 'error', 然后是 'message', 最后是 'msg'
                 if (err.response.data.error) {
                      requestError.value = `提交发票请求失败: ${err.response.data.error}`;
                 } else if (err.response.data.message) { // 根据用户反馈，成功消息用 message
                      requestError.value = `提交发票请求失败: ${err.response.data.message}`; // 错误也可能用 message
                 } else if (err.response.data.msg) { // 保留 msg 作为可能的 fallback
                      requestError.value = `提交发票请求失败: ${err.response.data.msg}`;
                 }
                  else {
                     requestError.value = `提交发票请求失败: 服务器返回未知错误结构或无错误信息。完整响应: ${JSON.stringify(err.response.data)}`;
                 }
                 console.error("提交发票请求失败响应:", err.response.data);
             }
             else { // err.response exists but no data field
                 requestError.value = `提交发票请求失败: ${err.response.statusText || '未知错误'}`;
             }
        } else if (err.request) {
             requestError.value = '提交发票请求失败: 未收到服务器响应 (网络错误)';
        } else {
             requestError.value = `提交发票请求失败: ${err.message}`;
        }
    } finally {
        isSubmittingRequest.value = false; // 结束提交加载状态
    }
};


// 重置筛选条件
const resetFilters = () => {
    filterStatus.value = '';
    filterRequestStartDate.value = null;
    filterRequestEndDate.value = null;
    // 重置后自动刷新列表
    fetchUserInvoices();
};

// 辅助函数：格式化日期 (YYYY-MM-DD)
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    // 后端返回的日期可能是 ISO 格式，需要格式化
    try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
             const year = date.getFullYear();
             const month = String(date.getMonth() + 1).padStart(2, '0');
             const day = String(date.getDate()).padStart(2, '0');
             return `${year}-${month}-${day}`;
        }
     } catch (e) {
         console.error("日期格式化错误:", dateString, e);
     }
    return dateString;
};

// 辅助函数：格式化日期时间 (例如 RequestedAt)
const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
        const date = new Date(dateTimeString);
         if (!isNaN(date.getTime())) {
             const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
             return new Intl.DateTimeFormat('zh-CN', options).format(date);
        }
    } catch (e) {
        console.error("日期时间格式化错误:", dateTimeString, e);
    }
    return dateTimeString;
};

// 辅助函数：格式化货币 (分转元)
const formatCurrency = (amountInCents) => {
    if (amountInCents === null || amountInCents === undefined) return 'N/A';
     // 确保是数字
    const amount = Number(amountInCents);
    if (isNaN(amount)) return '无效金额';
    return (amount / 100.0).toFixed(2) + ' 元'; // 或者使用 currency 变量
};


// --- 生命周期钩子 ---
onMounted(() => {
  console.log("InvoicePage Mounted, Fetching user invoices...");
  fetchUserInvoices(); // 页面加载后立即获取用户发票记录列表
});

</script>

<style scoped>
h1 {
  color: teal; /* 青色标题 */
}
h2 {
    margin-top: 20px;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
    color: #555;
}

.request-form {
    margin-bottom: 30px;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 8px;
    background-color: #f9f9f9;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block; /* Label on its own line */
    margin-bottom: 5px;
    font-weight: bold;
    color: #333;
}

.form-group input[type="text"],
.form-group input[type="date"] {
    width: calc(100% - 22px); /* Adjust width considering padding and border */
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1em;
}

.request-form button {
    padding: 10px 20px;
    background-color: #28a745; /* 绿色 */
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1.1em;
}
.request-form button:hover:not(:disabled) {
    background-color: #218838;
}
.request-form button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
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
}
.filter-form label:first-child {
     margin-left: 0;
}

.filter-form input[type="date"],
.filter-form select {
    margin-right: 10px;
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.filter-form button {
     padding: 5px 10px;
     cursor: pointer;
     border: none;
     border-radius: 4px;
     margin-right: 5px;
     background-color: #007bff;
     color: white;
}
.filter-form button:hover:not(:disabled) {
    background-color: #0056b3;
}
.filter-form button:last-child {
     margin-right: 0;
     background-color: #6c757d;
}
.filter-form button:last-child:hover:not(:disabled) {
     background-color: #5a6268;
}
.filter-form button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}


.invoice-list {
  list-style: none;
  padding: 0;
}

.invoice-item {
  border: 1px solid #ccc;
  margin-bottom: 10px;
  padding: 15px;
  border-radius: 5px;
  background-color: #fff;
}

.invoice-item strong {
    display: inline-block; /* 让标题独占一行或有固定宽度 */
    width: 120px; /* 根据需要调整宽度 */
    text-align: right;
    margin-right: 5px;
}

/* 发票状态颜色 */
.status-pending { color: orange; }
.status-approved { color: green; }
.status-completed { color: #007bff; font-weight: bold; }
.status-rejected { color: red; }
.status-cancelled { color: gray; }

</style>
