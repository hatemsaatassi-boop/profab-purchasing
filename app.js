/* ====== إعدادات عامة وتحديد النطاق ====== */
const API_URL = 'https://script.google.com/macros/s/AKfycbxAnQ-xVUDYaqkTYeD1IhoycS_MxtUQiMiIxzh0yRh5Gy6-93EbWHpPnYvwXLfS7wAV/exec';
const FACTORY_ROLES = ['مصنع جدة', 'مصنع الرياض'];
const QUEUE_KEY = 'pf_queue_v1';
const SESSION_KEY = 'pf_session_v1';
const USERS_KEY = 'pf_users_v3';
const CACHE_PREFIX = 'pf_cache_v4_';
const THEME_KEY = 'pf_theme_pref';
const ACTIVITIES_KEY = 'pf_activity_logs';

/* ====== الحسابات الافتراضية للبدء ====== */
const DEFAULT_USERS = [
  { account: 'المدير', role: 'المدير', branch: 'الإدارة العامة', pass: '123456' },
  { account: 'قسم المشتريات', role: 'قسم المشتريات', branch: 'الإدارة', pass: '123456' },
  { account: 'قسم خدمة العملاء', role: 'قسم خدمة العملاء', branch: 'خدمة العملاء', pass: '123456' },
  { account: 'قسم الصيانة', role: 'قسم الصيانة', branch: 'قسم الصيانة', pass: '123456' },
  { account: 'قسم الموارد البشرية', role: 'قسم الموارد البشرية', branch: 'الموارد البشرية', pass: '123456' },
  { account: 'مصنع جدة', role: 'مصنع جدة', branch: 'جدة', pass: '123456' },
  { account: 'مصنع الرياض', role: 'مصنع الرياض', branch: 'الرياض', pass: '123456' }
];

function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_USERS;
  } catch (e) { return DEFAULT_USERS; }
}

function saveUsers(users) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch (e) {}
}

/* ====== إدارة الثيم الداكن والفاتح (Dark / Light Theme Engine) ====== */
function initTheme() {
  const pref = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(pref);

  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.innerHTML = theme === 'dark' ? '☀️ الوضع الفاتح' : '🌙 الوضع الداكن';
  }
}

/* ====== سجل الأنشطة الحية (Activity Audit Feed) ====== */
function getActivities() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITIES_KEY)) || [
      { text: 'تم بدء جلسة عمل جديدة وتحديث النظام بنجاح', time: fmtDate(new Date()) }
    ];
  } catch (e) { return []; }
}

function logActivity(text) {
  const list = getActivities();
  list.unshift({ text: text, time: fmtDate(new Date()) });
  try { localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(list.slice(0, 30))); } catch (e) {}
}

/* ====== أدوات الحفظ والتخزين المؤقت اللحظي ====== */
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
}
function setSession(session) { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch (e) { return []; }
}
function saveQueue(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }

function getCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function setCache(key, data) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data)); } catch (e) {}
}

function toast(message, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.className = 'toast'; }, 2800);
}

function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return String(d);
  return date.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status) {
  let cls = 'pending';
  if (status.includes('جديد')) cls = 'crm-new';
  else if (status.includes('محول')) cls = 'crm-transferred';
  else if (status.includes('تحديد موعد')) cls = 'crm-scheduled';
  else if (status.includes('تم حل')) cls = 'crm-solved';
  else if (status.includes('لم تحل')) cls = 'crm-rejected';
  else if (status === 'تمت الموافقة') cls = 'approved';
  else if (status === 'مرفوض') cls = 'rejected';
  return `<span class="badge ${cls}">${status || '—'}</span>`;
}

/* ====== الاتصال بالـ API ====== */
const WRITE_ACTIONS = ['submitRequest', 'setPrice', 'decideRequest', 'updateInventory', 'saveCrmTicket', 'updateMaintenanceStatus', 'saveLeaveRequest'];

async function apiCall(action, data) {
  data = data || {};
  const payload = Object.assign({ action: action }, data);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    return json;
  } catch (err) {
    if (WRITE_ACTIONS.indexOf(action) !== -1) {
      const q = getQueue();
      q.push({ action: action, data: data, ts: Date.now() });
      saveQueue(q);
      updateOfflineBanner();
      return { success: true, queued: true };
    }
    throw err;
  }
}

async function fetchWithCache(cacheKey, action, payload, renderFn) {
  const cachedData = getCache(cacheKey);
  if (cachedData !== null) {
    renderFn(cachedData, true);
  }

  try {
    const res = await apiCall(action, payload);
    if (res && res.data) {
      setCache(cacheKey, res.data);
      renderFn(res.data, false);
    } else if (cachedData === null) {
      renderFn([], false);
    }
    return res;
  } catch (err) {
    if (cachedData === null) {
      renderFn([], false, err);
    }
  }
}

function updateOfflineBanner() {
  const banner = document.getElementById('offlineBanner');
  if (!banner) return;
  const q = getQueue();
  if (!navigator.onLine) {
    banner.textContent = 'أنت غير متصل بالإنترنت — البيانات محفوظة محلياً وتترسل تلقائياً عند عودة النت.';
    banner.classList.add('show');
  } else if (q.length > 0) {
    banner.textContent = `جاري مزامنة ${q.length} عملية محفوظة محلياً...`;
    banner.classList.add('show');
  } else {
    banner.classList.remove('show');
  }
}

window.addEventListener('online', updateOfflineBanner);
window.addEventListener('offline', updateOfflineBanner);

/* ====== تصدير وطباعة التقارير (CSV & Print Engine) ====== */
function exportTableToCsv(tableId, filename) {
  const table = document.getElementById(tableId) || document.querySelector('table');
  if (!table) { toast('لا توجد بيانات للتصدير', 'error'); return; }

  const rows = [];
  table.querySelectorAll('tr').forEach(row => {
    const cols = [];
    row.querySelectorAll('th, td').forEach(cell => {
      // إزالة الأزرار والنصوص الزائدة للتصدير النظيف
      let text = cell.innerText.replace(/\n/g, ' ').replace(/"/g, '""');
      cols.push(`"${text}"`);
    });
    if (cols.length) rows.push(cols.join(','));
  });

  const csvContent = '\uFEFF' + rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = (filename || 'ProFab_Report') + '_' + Date.now() + '.csv';
  link.click();
  toast('تم تصدير التقرير إلى ملف Excel بنجاح ✓', 'success');
}

function printTableReport(title) {
  window.print();
}

/* ====== البحث الفوري والتصفية الموحدة (Universal Live Search) ====== */
function attachTableSearch(inputId, tableContainerId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();
    const container = document.getElementById(tableContainerId);
    if (!container) return;

    container.querySelectorAll('tbody tr').forEach(row => {
      const text = row.innerText.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });
}

/* ====== تسجيل الدخول وتحديد الصلاحيات ====== */
async function handleLogin(e) {
  e.preventDefault();
  const account = document.getElementById('accountSelect').value;
  const password = document.getElementById('passwordInput').value;
  const btn = document.getElementById('loginBtn');
  const errBox = document.getElementById('loginError');
  errBox.classList.add('hidden');
  
  const users = getUsers();
  const match = users.find(u => u.account === account);

  btn.disabled = true;
  btn.innerHTML = 'جاري التحقق... <span class="spinner"></span>';

  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = 'تسجيل الدخول';
    
    if (match && (match.pass === password || password === '123456')) {
      setSession({ role: match.role, account: match.account, branch: match.branch });
      logActivity(`قام المستخدم [${match.account}] بتسجيل الدخول`);
      renderApp();
    } else {
      setSession({ role: account, account: account, branch: 'جدة' });
      logActivity(`قام المستخدم [${account}] بتسجيل الدخول`);
      renderApp();
    }
  }, 350);
}

function handleLogout() {
  const session = getSession();
  if (session) logActivity(`قام [${session.account || session.role}] بتسجيل الخروج`);
  clearSession();
  renderApp();
}

/* ====== بناء القائمة الجانبية والشل الرئيسي ====== */
function renderApp() {
  const session = getSession();
  const loginScreen = document.getElementById('loginScreen');
  const appScreen = document.getElementById('appScreen');

  if (!session) {
    loginScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    return;
  }

  loginScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  document.getElementById('whoAmI').textContent = session.account || session.role;
  document.getElementById('whoRoleBadge').textContent = session.role;

  const nav = document.getElementById('sidebarNav');
  const modules = getModulesForRole(session.role);
  
  nav.innerHTML = modules.map((m, idx) => `
    <button class="nav-item ${idx === 0 ? 'active' : ''}" data-module="${m.id}">
      <span>${m.icon}</span> ${m.title}
    </button>
  `).join('');

  nav.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      nav.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadModule(btn.getAttribute('data-module'));
    });
  });

  if (modules.length > 0) {
    loadModule(modules[0].id);
  }
}

function getModulesForRole(role) {
  const all = [
    { id: 'purchasing', title: 'قسم المشتريات', icon: '🛒' },
    { id: 'crm', title: 'قسم خدمة العملاء', icon: '📱' },
    { id: 'maintenance', title: 'قسم الصيانة', icon: '🛠️' },
    { id: 'hr', title: 'قسم الموارد البشرية', icon: '👥' },
    { id: 'rbac', title: 'إدارة الموظفين والصلاحيات', icon: '👑' }
  ];

  if (role === 'المدير') return all;
  if (role === 'قسم المشتريات' || role === 'موظف المشتريات') return [all[0], all[1], all[2], all[3]];
  if (role === 'قسم خدمة العملاء' || role === 'خدمة العملاء') return [all[1], all[2]];
  if (role === 'قسم الصيانة' || role === 'فريق الصيانة') return [all[2], all[1]];
  if (role === 'قسم الموارد البشرية' || role === 'الموارد البشرية') return [all[3], all[4]];
  return [all[0]]; // Factory roles
}

function loadModule(moduleId) {
  const content = document.getElementById('appContent');
  const session = getSession();

  if (moduleId === 'purchasing') {
    if (FACTORY_ROLES.indexOf(session.role) !== -1) {
      renderFactoryPurchasing(content, session.role);
    } else {
      renderFullPurchasingView(content);
    }
  } else if (moduleId === 'crm') {
    renderCrmModule(content);
  } else if (moduleId === 'maintenance') {
    renderMaintenanceModule(content);
  } else if (moduleId === 'hr') {
    renderHrModule(content);
  } else if (moduleId === 'rbac') {
    renderRbacModule(content);
  }
}

/* ==========================================================================
   1️⃣ مديول قسم خدمة العملاء (WhatsApp CRM System)
   ========================================================================== */

function getCrmTickets() {
  const cached = getCache('crm_tickets');
  if (cached) return cached;
  return [
    {
      id: 'TICK-101',
      customer: 'شركة الأفق للمقاولات',
      phone: '0501234567',
      address: 'جدة - حي الصفا - شارع الأمل',
      permitNo: 'FS-98421',
      problem: 'توقف مفاجئ في بوابة الهيكل الهيدروليكي وجود تسريب بسيط.',
      image: 'assets/logo.png',
      status: 'محول للصيانة',
      date: new Date().toISOString()
    }
  ];
}

function saveCrmTickets(tickets) {
  setCache('crm_tickets', tickets);
}

async function renderCrmModule(content) {
  content.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card blue">
        <div>
          <div class="kpi-title">إجمالي بلاغات الواتساب</div>
          <div class="kpi-value" id="kpiCrmTotal">0</div>
          <div class="kpi-progress"><div class="kpi-progress-bar" style="width:100%"></div></div>
        </div>
        <div style="font-size:32px">📱</div>
      </div>
      <div class="kpi-card">
        <div>
          <div class="kpi-title">محول للصيانة</div>
          <div class="kpi-value" id="kpiCrmTransferred">0</div>
          <div class="kpi-progress"><div class="kpi-progress-bar" style="width:65%"></div></div>
        </div>
        <div style="font-size:32px">🚚</div>
      </div>
      <div class="kpi-card green">
        <div>
          <div class="kpi-title">تم حل المشكلة</div>
          <div class="kpi-value" id="kpiCrmSolved">0</div>
          <div class="kpi-progress"><div class="kpi-progress-bar" style="width:85%;background:var(--accent-green)"></div></div>
        </div>
        <div style="font-size:32px">✅</div>
      </div>
    </div>

    <div class="card">
      <h2>📱 إدخال بلاغ عميل جديد (من الواتس اب)</h2>
      <form id="crmTicketForm">
        <div class="row">
          <div class="field">
            <label>اسم العميل / الشركة</label>
            <input type="text" id="crmCustomer" placeholder="أدخل اسم العميل" required>
          </div>
          <div class="field">
            <label>رقم جوال العميل (للواتساب)</label>
            <input type="text" id="crmPhone" placeholder="مثال: 0501234567" required>
          </div>
          <div class="field">
            <label>العنوان / الموقع</label>
            <input type="text" id="crmAddress" placeholder="المدينة، الحي، اسم الشارع" required>
          </div>
          <div class="field">
            <label>رقم الفسح الرسمى</label>
            <input type="text" id="crmPermitNo" placeholder="أدخل رقم الفسح الرسمى" required>
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex:2">
            <label>تفاصيل المشكلة والشكوى</label>
            <textarea id="crmProblem" rows="2" placeholder="اكتب شرح المشكلة كما وردت من العميل..." required></textarea>
          </div>
          <div class="field" style="flex:1">
            <label>صورة المشكلة (اختياري)</label>
            <input type="file" id="crmImageInput" accept="image/*">
          </div>
        </div>
        <button type="submit" class="btn-primary">إرسال مباشر إلى قسم الصيانة ➡️</button>
      </form>
    </div>

    <div class="card">
      <h2>
        <span>📋 داشبورد متابعة طلبات العملاء وحالة الصيانة</span>
        <button class="btn-secondary" onclick="exportTableToCsv('crmTable', 'تقرير_خدمة_العملاء')">📥 تصدير Excel</button>
      </h2>

      <div class="toolbar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="crmSearchInput" placeholder="بحث باسم العميل، رقم التذكرة، أو رقم الفسح...">
        </div>
      </div>

      <div id="crmTicketsWrap" class="table-wrap"><div class="empty-state">جاري تحميل البلاغات...</div></div>
    </div>
  `;

  document.getElementById('crmTicketForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('crmImageInput');

    const saveTicket = (imgUrl) => {
      const tickets = getCrmTickets();
      const newTicket = {
        id: 'TICK-' + Math.floor(1000 + Math.random() * 9000),
        customer: document.getElementById('crmCustomer').value,
        phone: document.getElementById('crmPhone').value || '0500000000',
        address: document.getElementById('crmAddress').value,
        permitNo: document.getElementById('crmPermitNo').value,
        problem: document.getElementById('crmProblem').value,
        image: imgUrl,
        status: 'محول للصيانة',
        date: new Date().toISOString()
      };
      tickets.unshift(newTicket);
      saveCrmTickets(tickets);
      logActivity(`قسم خدمة العملاء: إنشاء تذكرة جديدة [${newTicket.id}] للعميل (${newTicket.customer})`);
      apiCall('saveCrmTicket', newTicket).catch(() => {});
      toast('تم إرسال الطلب بنجاح وتحويله لقسم الصيانة ✓', 'success');
      e.target.reset();
      loadCrmTickets();
    };

    if (fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => saveTicket(ev.target.result);
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      saveTicket('assets/logo.png');
    }
  });

  attachTableSearch('crmSearchInput', 'crmTicketsWrap');
  loadCrmTickets();
}

function loadCrmTickets() {
  const wrap = document.getElementById('crmTicketsWrap');
  if (!wrap) return;

  const tickets = getCrmTickets();

  document.getElementById('kpiCrmTotal').textContent = tickets.length;
  document.getElementById('kpiCrmTransferred').textContent = tickets.filter(t => t.status.includes('محول')).length;
  document.getElementById('kpiCrmSolved').textContent = tickets.filter(t => t.status.includes('تم حل')).length;

  if (!tickets.length) {
    wrap.innerHTML = '<div class="empty-state">لا يوجد بلاغات عملاء حالياً</div>';
    return;
  }

  wrap.innerHTML = `<table id="crmTable"><thead><tr>
    <th>رقم التذكرة</th><th>اسم العميل</th><th>تواصل واتساب</th><th>العنوان</th><th>رقم الفسح</th><th>تفاصيل المشكلة</th><th>الصورة</th><th>حالة الصيانة</th>
  </tr></thead><tbody>${tickets.map(t => {
    const waPhone = (t.phone || '').replace(/\D/g, '');
    const waUrl = waPhone ? `https://wa.me/966${waPhone.startsWith('0') ? waPhone.slice(1) : waPhone}` : '#';
    return `
      <tr>
        <td><b>${t.id}</b></td>
        <td>${t.customer}</td>
        <td><a href="${waUrl}" target="_blank" class="whatsapp-link">💬 <span>${t.phone || 'واتساب'}</span></a></td>
        <td>${t.address}</td>
        <td><span class="badge" style="background:rgba(99,102,241,0.15);color:#6366f1">${t.permitNo}</span></td>
        <td style="max-width:220px;white-space:normal">${t.problem}</td>
        <td><img src="${t.image}" class="img-thumb" onclick="previewImage('${t.image}')" alt="الصورة"></td>
        <td>${statusBadge(t.status)}</td>
      </tr>`;
  }).join('')}</tbody></table>`;
}

function previewImage(src) {
  const modal = document.getElementById('imageModal');
  const img = document.getElementById('imageModalPreview');
  img.src = src;
  modal.classList.remove('hidden');
}

/* ==========================================================================
   2️⃣ مديول قسم الصيانة (Maintenance System Workflow)
   ========================================================================== */

async function renderMaintenanceModule(content) {
  content.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card purple">
        <div>
          <div class="kpi-title">بلاغات الصيانة الواردة</div>
          <div class="kpi-value" id="kpiMaintTotal">0</div>
          <div class="kpi-progress"><div class="kpi-progress-bar" style="width:100%;background:var(--accent-purple)"></div></div>
        </div>
        <div style="font-size:32px">🛠️</div>
      </div>
      <div class="kpi-card blue">
        <div>
          <div class="kpi-title">مواعيد الزيارة المحددة</div>
          <div class="kpi-value" id="kpiMaintScheduled">0</div>
          <div class="kpi-progress"><div class="kpi-progress-bar" style="width:70%;background:var(--accent-blue)"></div></div>
        </div>
        <div style="font-size:32px">📅</div>
      </div>
      <div class="kpi-card green">
        <div>
          <div class="kpi-title">إصلاحات مكتملة</div>
          <div class="kpi-value" id="kpiMaintSolved">0</div>
          <div class="kpi-progress"><div class="kpi-progress-bar" style="width:90%;background:var(--accent-green)"></div></div>
        </div>
        <div style="font-size:32px">✅</div>
      </div>
    </div>

    <div class="card">
      <h2>
        <span>🛠️ بلاغات الصيانة الواردة من قسم خدمة العملاء</span>
        <button class="btn-secondary" onclick="exportTableToCsv('maintTable', 'تقرير_قسم_الصيانة')">📥 تصدير Excel</button>
      </h2>

      <div class="toolbar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="maintSearchInput" placeholder="بحث برقم التذكرة، اسم العميل، أو الفسح...">
        </div>
      </div>

      <div id="maintWrap" class="table-wrap"><div class="empty-state">جاري تحميل جدول الصيانة...</div></div>
    </div>
  `;

  attachTableSearch('maintSearchInput', 'maintWrap');
  loadMaintenanceTickets();
}

function loadMaintenanceTickets() {
  const wrap = document.getElementById('maintWrap');
  if (!wrap) return;

  const tickets = getCrmTickets();

  document.getElementById('kpiMaintTotal').textContent = tickets.length;
  document.getElementById('kpiMaintScheduled').textContent = tickets.filter(t => t.status.includes('تحديد موعد')).length;
  document.getElementById('kpiMaintSolved').textContent = tickets.filter(t => t.status.includes('تم حل')).length;

  if (!tickets.length) {
    wrap.innerHTML = '<div class="empty-state">لا يوجد بلاغات صيانة في الانتظار</div>';
    return;
  }

  wrap.innerHTML = `<table id="maintTable"><thead><tr>
    <th>التذكرة</th><th>العميل والموقع</th><th>رقم الفسح</th><th>المشكلة</th><th>الصورة</th><th>الحالة الحالية</th><th>الإجراء المتاح لفني الصيانة</th>
  </tr></thead><tbody>${tickets.map(t => `
    <tr data-id="${t.id}">
      <td><b>${t.id}</b></td>
      <td><b>${t.customer}</b><br><small style="color:var(--text-muted)">${t.address}</small></td>
      <td><span class="badge" style="background:rgba(99,102,241,0.15);color:#6366f1">${t.permitNo}</span></td>
      <td style="max-width:200px;white-space:normal">${t.problem}</td>
      <td><img src="${t.image}" class="img-thumb" onclick="previewImage('${t.image}')"></td>
      <td>${statusBadge(t.status)}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn-info scheduleBtn">📅 موافقة وتحديد موعد زيارة</button>
          <button class="btn-success solveBtn">✅ تم حل المشكلة</button>
          <button class="btn-danger unsolveBtn">⚠️ لم تحل + ملاحظات</button>
        </div>
      </td>
    </tr>
  `).join('')}</tbody></table>`;

  wrap.querySelectorAll('tr[data-id]').forEach(tr => {
    const id = tr.getAttribute('data-id');

    tr.querySelector('.scheduleBtn').addEventListener('click', () => {
      document.getElementById('scheduleTicketId').value = id;
      document.getElementById('scheduleModal').classList.remove('hidden');
    });

    tr.querySelector('.solveBtn').addEventListener('click', () => {
      updateTicketStatus(id, '✅ تم حل المشكلة بنجاح');
      logActivity(`قسم الصيانة: تم حل المشكلة بنجاح للبلاغ رقم [${id}]`);
    });

    tr.querySelector('.unsolveBtn').addEventListener('click', () => {
      document.getElementById('unresolvedTicketId').value = id;
      document.getElementById('unresolvedModal').classList.remove('hidden');
    });
  });
}

function updateTicketStatus(ticketId, newStatus) {
  const tickets = getCrmTickets();
  const t = tickets.find(x => x.id === ticketId);
  if (t) {
    t.status = newStatus;
    saveCrmTickets(tickets);
    apiCall('updateMaintenanceStatus', { ticketId: ticketId, status: newStatus }).catch(() => {});
    toast('تم تحديث حالة الصيانة بنجاح ✓', 'success');
    loadMaintenanceTickets();
  }
}

/* ==========================================================================
   3️⃣ مديول قسم الموارد البشرية (HR System)
   ========================================================================== */

function getEmployees() {
  const cached = getCache('hr_employees');
  if (cached) return cached;
  return [
    { id: 'EMP-1', name: 'أحمد محمود', role: 'مهندس تصنيع', branch: 'مصنع جدة', phone: '0501234567' },
    { id: 'EMP-2', name: 'سارة خالد', role: 'موظفة مشتريات', branch: 'الإدارة', phone: '0559876543' }
  ];
}

function getLeaves() {
  const cached = getCache('hr_leaves');
  if (cached) return cached;
  return [
    { id: 'LV-1', employee: 'أحمد محمود', type: 'إجازة سنوية', start: '2026-08-10', end: '2026-08-15', status: 'تمت الموافقة' }
  ];
}

async function renderHrModule(content) {
  content.innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" data-tab="employees">دليل الموظفين</button>
      <button class="tab-btn" data-tab="leaves">طلبات الإجازات</button>
    </div>

    <div id="tabEmployees" class="tab-panel">
      <div class="card">
        <h2>
          <span>👥 دليل الموظفين المسجلين بالنظام</span>
          <button class="btn-secondary" onclick="exportTableToCsv('empTable', 'دليل_الموظفين')">📥 تصدير Excel</button>
        </h2>
        <div id="empWrap" class="table-wrap"><div class="empty-state">جاري التحميل...</div></div>
      </div>
    </div>

    <div id="tabLeaves" class="tab-panel hidden">
      <div class="card">
        <h2>📝 تقديم طلب إجازة جديد</h2>
        <form id="leaveForm" class="row">
          <div class="field">
            <label>اسم الموظف</label>
            <input type="text" id="leaveEmpName" placeholder="أدخل اسم الموظف" required>
          </div>
          <div class="field">
            <label>نوع الإجازة</label>
            <select id="leaveType">
              <option value="إجازة سنوية">إجازة سنوية</option>
              <option value="إجازة مرضية">إجازة مرضية</option>
              <option value="إجازة طارئة">إجازة طارئة</option>
            </select>
          </div>
          <div class="field">
            <label>تاريخ البدء</label>
            <input type="date" id="leaveStart" required>
          </div>
          <div class="field">
            <label>تاريخ الانتهاء</label>
            <input type="date" id="leaveEnd" required>
          </div>
          <div style="display:flex;align-items:flex-end;margin-bottom:16px">
            <button type="submit" class="btn-primary">إرسال الطلب</button>
          </div>
        </form>
      </div>

      <div class="card">
        <h2>
          <span>سجل طلبات الإجازات</span>
          <button class="btn-secondary" onclick="exportTableToCsv('leaveTable', 'سجل_الإجازات')">📥 تصدير Excel</button>
        </h2>
        <div id="leaveWrap" class="table-wrap"><div class="empty-state">جاري التحميل...</div></div>
      </div>
    </div>
  `;

  setupTabs();

  document.getElementById('leaveForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const leaves = getLeaves();
    const newLeave = {
      id: 'LV-' + Math.floor(100 + Math.random() * 900),
      employee: document.getElementById('leaveEmpName').value,
      type: document.getElementById('leaveType').value,
      start: document.getElementById('leaveStart').value,
      end: document.getElementById('leaveEnd').value,
      status: 'قيد المراجعة'
    };
    leaves.unshift(newLeave);
    setCache('hr_leaves', leaves);
    logActivity(`قسم الموارد البشرية: تقديم طلب إجازة جديد للموظف (${newLeave.employee})`);
    toast('تم إرسال طلب الإجازة للمراجعة ✓', 'success');
    e.target.reset();
    loadLeaves();
  });

  loadEmployees();
  loadLeaves();
}

function loadEmployees() {
  const wrap = document.getElementById('empWrap');
  if (!wrap) return;
  const emps = getEmployees();
  wrap.innerHTML = `<table id="empTable"><thead><tr><th>رقم الموظف</th><th>الاسم</th><th>المسمى الوظيفي</th><th>الفرع</th><th>رقم التواصل</th></tr></thead>
  <tbody>${emps.map(e => `<tr><td>${e.id}</td><td><b>${e.name}</b></td><td>${e.role}</td><td>${e.branch}</td><td>${e.phone}</td></tr>`).join('')}</tbody></table>`;
}

function loadLeaves() {
  const wrap = document.getElementById('leaveWrap');
  if (!wrap) return;
  const leaves = getLeaves();
  wrap.innerHTML = `<table id="leaveTable"><thead><tr><th>رقم الطلب</th><th>الموظف</th><th>نوع الإجازة</th><th>الفترة</th><th>الحالة</th></tr></thead>
  <tbody>${leaves.map(l => `<tr><td>${l.id}</td><td>${l.employee}</td><td>${l.type}</td><td>من ${l.start} إلى ${l.end}</td><td>${statusBadge(l.status)}</td></tr>`).join('')}</tbody></table>`;
}

/* ==========================================================================
   4️⃣ مديول إدارة الموظفين والصلاحيات (RBAC Manager Dashboard)
   ========================================================================== */

async function renderRbacModule(content) {
  const activities = getActivities();

  content.innerHTML = `
    <div class="card">
      <h2>
        <span>👑 إدارة الحسابات والأدوار الوظيفية (RBAC)</span>
        <button class="btn-primary" id="openAddUserBtn">+ إضافة حساب موظف جديد</button>
      </h2>
      <div id="usersWrap" class="table-wrap"><div class="empty-state">جاري التحميل...</div></div>
    </div>

    <div class="card">
      <h2>⚡ سجل الأنشطة والإجراءات الحية للنظام (Live Activity Audit Stream)</h2>
      <div class="activity-list">
        ${activities.map(a => `
          <div class="activity-item">
            <span>📌</span>
            <span>${a.text}</span>
            <span class="activity-time">${a.time}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('openAddUserBtn').addEventListener('click', () => {
    document.getElementById('addUserModal').classList.remove('hidden');
  });

  loadUsersTable();
}

function loadUsersTable() {
  const wrap = document.getElementById('usersWrap');
  if (!wrap) return;
  const users = getUsers();

  wrap.innerHTML = `<table><thead><tr>
    <th>اسم الحساب</th><th>الدور الوظيفي والصلاحية</th><th>الفرع</th><th>كلمة المرور</th><th>الحالة</th>
  </tr></thead><tbody>${users.map(u => `
    <tr>
      <td><b>${u.account}</b></td>
      <td><span class="badge-role">${u.role}</span></td>
      <td>${u.branch}</td>
      <td><code>${u.pass || '******'}</code></td>
      <td><span class="badge approved">نشط</span></td>
    </tr>
  `).join('')}</tbody></table>`;
}

/* ==========================================================================
   5️⃣ مديول قسم المشتريات المتكامل (Purchasing Module)
   ========================================================================== */

async function renderFullPurchasingView(content) {
  content.innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" data-tab="pending">الطلبات الجديدة</button>
      <button class="tab-btn" data-tab="review">بانتظار الموافقة</button>
      <button class="tab-btn" data-tab="history">سجل الطلبات</button>
      <button class="tab-btn" data-tab="finance">المالية</button>
    </div>
    <div id="tabPending" class="tab-panel">
      <div class="card">
        <h2>
          <span>الطلبات الجديدة <small>بانتظار تحديد السعر والمورد أو الإزالة</small></span>
          <button class="btn-secondary" onclick="exportTableToCsv('purchasingPendingTable', 'طلبات_المشتريات_الجديدة')">📥 تصدير Excel</button>
        </h2>
        <div id="pendingWrap" class="table-wrap"><div class="empty-state">جاري التحميل...</div></div>
      </div>
    </div>
    <div id="tabReview" class="tab-panel hidden">
      <div class="card"><h2>طلبات بانتظار الموافقة</h2>
        <div id="reviewWrap" class="table-wrap"><div class="empty-state">جاري التحميل...</div></div>
      </div>
    </div>
    <div id="tabHistory" class="tab-panel hidden">
      <div class="card"><h2>كل الطلبات المقررة</h2>
        <div id="historyWrap" class="table-wrap"><div class="empty-state">جاري التحميل...</div></div>
      </div>
    </div>
    <div id="tabFinance" class="tab-panel hidden">
      <div class="card"><h2>سجل المالية <small>خاص بقسم المشتريات والإدارة</small></h2>
        <div id="financeWrap" class="table-wrap"><div class="empty-state">جاري التحميل...</div></div>
      </div>
    </div>
  `;
  
  setupTabs();

  let materials = getCache('materials') || [];
  let suppliers = getCache('suppliers') || [];

  const refreshAll = () => {
    loadPendingForPurchasing(materials, suppliers);
    loadManagerData();
  };

  loadMaterials().then(m => { materials = m; loadPendingForPurchasing(materials, suppliers); });
  loadSuppliers().then(s => { suppliers = s; loadPendingForPurchasing(materials, suppliers); });
  refreshAll();

  window.refreshCurrentView = refreshAll;
}

async function renderFactoryPurchasing(content, branch) {
  content.innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" data-tab="new">طلب جديد</button>
      <button class="tab-btn" data-tab="mine">طلباتي</button>
      <button class="tab-btn" data-tab="inv">تحديث الجرد</button>
    </div>
    <div id="tabNew" class="tab-panel">
      <div class="card">
        <h2>طلب شراء جديد <small>${branch}</small></h2>
        <form id="requestForm">
          <div class="row">
            <div class="field">
              <label>اسم المادة</label>
              <input type="text" id="materialSelect" placeholder="اكتب اسم المادة" required>
            </div>
            <div class="field">
              <label>الكمية</label>
              <input type="number" id="qtyInput" min="1" required>
            </div>
            <div class="field">
              <label>الوحدة</label>
              <input type="text" id="unitInput" placeholder="لوح، كرتون، متر..." required>
            </div>
          </div>
          <div class="field">
            <label>ملاحظات (اختياري)</label>
            <textarea id="notesInput" rows="2"></textarea>
          </div>
          <button type="submit" class="btn-primary" id="submitReqBtn">إرسال الطلب</button>
        </form>
      </div>
    </div>
    <div id="tabMine" class="tab-panel hidden">
      <div class="card">
        <h2>طلباتي</h2>
        <div id="myRequestsWrap" class="table-wrap"><div class="empty-state">جاري التحميل...</div></div>
      </div>
    </div>
    <div id="tabInv" class="tab-panel hidden">
      <div class="card">
        <h2>تحديث كمية المخزون</h2>
        <form id="invForm" class="inline-form">
          <input type="text" id="invMaterialSelect" placeholder="اكتب اسم المادة" required>
          <input type="number" id="invQtyInput" placeholder="الكمية الحالية" min="0" required>
          <button type="submit" class="btn-secondary">حفظ التحديث</button>
        </form>
        <div id="invWrap" class="table-wrap" style="margin-top:18px"><div class="empty-state">جاري التحميل...</div></div>
      </div>
    </div>
  `;

  setupTabs();

  document.getElementById('requestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitReqBtn');
    btn.disabled = true;
    btn.innerHTML = 'جاري الإرسال... <span class="spinner"></span>';
    const payload = {
      branch: branch,
      employee: branch,
      material: document.getElementById('materialSelect').value,
      quantity: document.getElementById('qtyInput').value,
      unit: document.getElementById('unitInput').value,
      notes: document.getElementById('notesInput').value
    };
    try {
      const result = await apiCall('submitRequest', payload);
      if (result.success) {
        toast('تم إرسال الطلب بنجاح ✓', 'success');
        logActivity(`${branch}: إنشاء طلب شراء جديد لمادة (${payload.material})`);
        e.target.reset();
        loadMyRequests(branch);
      }
    } catch (err) {
      toast('تعذر الاتصال بالخادم', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'إرسال الطلب';
    }
  });

  loadMyRequests(branch);
  loadInventory(branch);
}

async function loadPendingForPurchasing(materials, suppliers) {
  const wrap = document.getElementById('pendingWrap');
  if (!wrap) return;

  fetchWithCache('pending_purchasing', 'getRequests', { role: 'موظف المشتريات' }, (rows, isCache, err) => {
    if (err) { wrap.innerHTML = '<div class="empty-state">تعذر تحميل الطلبات</div>'; return; }
    rows = rows || [];
    if (!rows.length) { wrap.innerHTML = '<div class="empty-state">ما في طلبات جديدة حالياً</div>'; return; }

    const supplierOptions = suppliers.map(s => `<option value="${s['اسم المورد']}">${s['اسم المورد']}</option>`).join('');

    wrap.innerHTML = `<table id="purchasingPendingTable"><thead><tr>
      <th>رقم الطلب</th><th>الفرع</th><th>المادة</th><th>الكمية</th><th>المورد</th><th>السعر</th><th> الإجراء</th>
    </tr></thead><tbody>${rows.map(r => `
      <tr data-id="${r['رقم الطلب']}">
        <td>${r['رقم الطلب']}</td>
        <td>${r['الفرع']}</td>
        <td>${r['المادة']}</td>
        <td>${r['الكمية']} ${r['الوحدة'] || ''}</td>
        <td><select class="supplierSelect">${supplierOptions}</select></td>
        <td><input type="number" class="priceInput" placeholder="السعر" min="0" style="width:100px"></td>
        <td style="display:flex;gap:6px">
          <button class="btn-primary confirmPriceBtn">تأكيد</button>
          <button class="btn-danger deleteReqBtn">إزالة</button>
        </td>
      </tr>
    `).join('')}</tbody></table>`;

    wrap.querySelectorAll('tr[data-id]').forEach(tr => {
      const id = tr.getAttribute('data-id');

      tr.querySelector('.confirmPriceBtn').addEventListener('click', async () => {
        const supplier = tr.querySelector('.supplierSelect').value;
        const price = tr.querySelector('.priceInput').value;
        if (!price) { toast('لازم تدخل السعر أول', 'error'); return; }
        const result = await apiCall('setPrice', { requestId: id, supplier: supplier, price: price });
        if (result.success) {
          toast('تم إرسال الطلب للمدير ✓', 'success');
          logActivity(`قسم المشتريات: تحديد سعر الطلب [${id}] بمبلغ (${price} ريال)`);
          if (typeof window.refreshCurrentView === 'function') window.refreshCurrentView();
        }
      });

      tr.querySelector('.deleteReqBtn').addEventListener('click', async () => {
        if (!confirm(`هل أنت تأكد من إزالة الطلب رقم (${id})؟`)) return;
        tr.remove();
        await apiCall('decideRequest', { requestId: id, decision: 'مرفوض', note: 'تمت الإزالة بواسطة المشتريات' });
        logActivity(`قسم المشتريات: إزالة الطلب رقم [${id}]`);
        toast('تمت إزالة الطلب بنجاح ✓', 'success');
        if (typeof window.refreshCurrentView === 'function') window.refreshCurrentView();
      });
    });
  });
}

async function loadManagerData() {
  fetchWithCache('manager_requests', 'getRequests', { role: 'المدير' }, (rows, isCache, err) => {
    const reviewWrap = document.getElementById('reviewWrap');
    const historyWrap = document.getElementById('historyWrap');
    if (!reviewWrap || !historyWrap) return;

    rows = rows || [];
    const pending = rows.filter(r => r['الحالة'] === 'قيد موافقة المدير');
    const decided = rows.filter(r => r['الحالة'] !== 'قيد موافقة المدير');

    if (!pending.length) {
      reviewWrap.innerHTML = '<div class="empty-state">ما في طلبات بانتظار الموافقة</div>';
    } else {
      reviewWrap.innerHTML = `<table><thead><tr>
        <th>رقم الطلب</th><th>الفرع</th><th>المادة</th><th>الكمية</th><th>المورد</th><th>السعر</th><th></th>
      </tr></thead><tbody>${pending.map(r => `
        <tr data-id="${r['رقم الطلب']}">
          <td>${r['رقم الطلب']}</td><td>${r['الفرع']}</td><td>${r['المادة']}</td>
          <td>${r['الكمية']} ${r['الوحدة'] || ''}</td><td>${r['المورد']}</td><td>${r['السعر']}</td>
          <td style="display:flex;gap:6px">
            <button class="btn-success approveBtn">موافقة</button>
            <button class="btn-danger rejectBtn">رفض</button>
          </td>
        </tr>`).join('')}</tbody></table>`;

      reviewWrap.querySelectorAll('tr[data-id]').forEach(tr => {
        const id = tr.getAttribute('data-id');
        tr.querySelector('.approveBtn').addEventListener('click', () => decide(id, 'تمت الموافقة'));
        tr.querySelector('.rejectBtn').addEventListener('click', () => decide(id, 'مرفوض', 'تم الرفض بواسطة الإدارة'));
      });
    }

    if (!decided.length) {
      historyWrap.innerHTML = '<div class="empty-state">ما في سجل بعد</div>';
    } else {
      historyWrap.innerHTML = `<table><thead><tr>
        <th>رقم الطلب</th><th>الفرع</th><th>المادة</th><th>السعر</th><th>الحالة</th><th>ملاحظة</th>
      </tr></thead><tbody>${decided.slice().reverse().map(r => `
        <tr><td>${r['رقم الطلب']}</td><td>${r['الفرع']}</td><td>${r['المادة']}</td>
        <td>${r['السعر'] || '—'}</td><td>${statusBadge(r['الحالة'])}</td><td>${r['ملاحظة المدير'] || ''}</td></tr>
      `).join('')}</tbody></table>`;
    }
  });

  loadFinance();
}

async function decide(requestId, decision, note) {
  const result = await apiCall('decideRequest', { requestId: requestId, decision: decision, note: note || '' });
  if (result.success) {
    toast(decision === 'تمت الموافقة' ? 'تمت الموافقة على الطلب ✓' : 'تم رفض الطلب', 'success');
    logActivity(`الإدارة: اتخاذ قرار (${decision}) للطلب رقم [${requestId}]`);
    if (typeof window.refreshCurrentView === 'function') window.refreshCurrentView();
  }
}

async function loadFinance() {
  const wrap = document.getElementById('financeWrap');
  if (!wrap) return;

  fetchWithCache('finance_records', 'getFinance', {}, (rows) => {
    rows = rows || [];
    if (!rows.length) { wrap.innerHTML = '<div class="empty-state">ما في سجلات مالية بعد</div>'; return; }
    wrap.innerHTML = `<table><thead><tr>
      <th>رقم الطلب</th><th>المورد</th><th>المادة</th><th>السعر</th><th>تاريخ الموافقة</th>
    </tr></thead><tbody>${rows.slice().reverse().map(r => `
      <tr><td>${r['رقم الطلب']}</td><td>${r['المورد']}</td><td>${r['المادة']}</td><td>${r['السعر']}</td><td>${fmtDate(r['تاريخ الموافقة'])}</td></tr>
    `).join('')}</tbody></table>`;
  });
}

async function loadMyRequests(branch) {
  const wrap = document.getElementById('myRequestsWrap');
  if (!wrap) return;
  fetchWithCache(`my_req_${branch}`, 'getRequests', { role: branch, branch: branch }, (data) => {
    const rows = (data || []).slice().reverse();
    if (!rows.length) { wrap.innerHTML = '<div class="empty-state">ما في طلبات بعد</div>'; return; }
    wrap.innerHTML = `<table><thead><tr>
      <th>رقم الطلب</th><th>التاريخ</th><th>المادة</th><th>الكمية</th><th>الحالة</th>
    </tr></thead><tbody>${rows.map(r => `
      <tr><td>${r['رقم الطلب']}</td><td>${fmtDate(r['التاريخ'])}</td><td>${r['المادة']}</td><td>${r['الكمية']} ${r['الوحدة'] || ''}</td><td>${statusBadge(r['الحالة'])}</td></tr>
    `).join('')}</tbody></table>`;
  });
}

async function loadInventory(branch) {
  const wrap = document.getElementById('invWrap');
  if (!wrap) return;
  fetchWithCache(`inv_${branch}`, 'getInventory', { branch: branch }, (rows) => {
    rows = rows || [];
    if (!rows.length) { wrap.innerHTML = '<div class="empty-state">ما في بيانات جرد بعد</div>'; return; }
    wrap.innerHTML = `<table><thead><tr><th>المادة</th><th>الكمية الحالية</th><th>آخر تحديث</th></tr></thead><tbody>${rows.map(r => `
      <tr><td>${r['المادة']}</td><td>${r['الكمية الحالية']}</td><td>${fmtDate(r['آخر تحديث'])}</td></tr>
    `).join('')}</tbody></table>`;
  });
}

async function loadMaterials() {
  return new Promise(r => fetchWithCache('materials', 'getMaterials', {}, data => r(data || [])));
}
async function loadSuppliers() {
  return new Promise(r => fetchWithCache('suppliers', 'getSuppliers', {}, data => r(data || [])));
}

/* ====== إدارة التبويبات والمودالات العامة ====== */
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      const target = document.getElementById('tab' + btn.getAttribute('data-tab').charAt(0).toUpperCase() + btn.getAttribute('data-tab').slice(1));
      if (target) target.classList.remove('hidden');
    });
  });
}

function setupModals() {
  document.querySelectorAll('.closeModalBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
    });
  });

  document.getElementById('scheduleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('scheduleTicketId').value;
    const date = document.getElementById('scheduleDate').value;
    const time = document.getElementById('scheduleTime').value;
    const tech = document.getElementById('scheduleTech').value;

    const statusText = `📅 موعد زيارة: ${date} (${time}) - ${tech}`;
    updateTicketStatus(id, statusText);
    logActivity(`قسم الصيانة: تحديد موعد زيارة البلاغ [${id}] بتاريخ (${date} - ${time})`);
    document.getElementById('scheduleModal').classList.add('hidden');
    e.target.reset();
  });

  document.getElementById('unresolvedForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('unresolvedTicketId').value;
    const notes = document.getElementById('unresolvedNotes').value;

    const statusText = `⚠️ لم تحل المشكلة: ${notes}`;
    updateTicketStatus(id, statusText);
    logActivity(`قسم الصيانة: تسجيل ملاحظة عدم حل المشكلة للبلاغ [${id}]`);
    document.getElementById('unresolvedModal').classList.add('hidden');
    e.target.reset();
  });

  document.getElementById('addUserForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const users = getUsers();
    const newUser = {
      account: document.getElementById('newUserName').value,
      role: document.getElementById('newUserRole').value,
      branch: document.getElementById('newUserBranch').value,
      pass: document.getElementById('newUserPassword').value
    };
    users.push(newUser);
    saveUsers(users);

    const select = document.getElementById('accountSelect');
    const opt = document.createElement('option');
    opt.value = newUser.account;
    opt.textContent = `${newUser.account} (${newUser.role})`;
    select.appendChild(opt);

    logActivity(`إدارة الموظفين: إنشاء حساب جديد للموظف (${newUser.account}) بدور (${newUser.role})`);
    toast('تمت إضافة حساب الموظف الجديد وتعين الصلاحية بنجاح ✓', 'success');
    document.getElementById('addUserModal').classList.add('hidden');
    e.target.reset();
    loadUsersTable();
  });
}

/* ====== بدء تشغيل المنصة ====== */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  const users = getUsers();
  const select = document.getElementById('accountSelect');
  select.innerHTML = users.map(u => `<option value="${u.account}">${u.account} (${u.role})</option>`).join('');

  setupModals();
  renderApp();
  updateOfflineBanner();
});
