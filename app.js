/* ====== إعدادات عامة ====== */
const API_URL = 'https://script.google.com/macros/s/AKfycbxAnQ-xVUDYaqkTYeD1IhoycS_MxtUQiMiIxzh0yRh5Gy6-93EbWHpPnYvwXLfS7wAV/exec';
const FACTORY_ROLES = ['مصنع جدة', 'مصنع الرياض'];
const QUEUE_KEY = 'pf_queue_v1';
const SESSION_KEY = 'pf_session_v1';
const CACHE_KEY = 'pf_cache_v1';

/* ====== أدوات مساعدة ====== */
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
}
function setSession(session) { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch (e) { return []; }
}
function saveQueue(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }

function getCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch (e) { return {}; }
}
function setCache(key, data) {
  const c = getCache();
  c[key] = data;
  localStorage.setItem(CACHE_KEY, JSON.stringify(c));
}

function toast(message, type) {
  const el = document.getElementById('toast');
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
  const map = {
    'قيد المراجعة': 'pending',
    'قيد موافقة المدير': 'reviewing',
    'تمت الموافقة': 'approved',
    'مرفوض': 'rejected'
  };
  const cls = map[status] || 'pending';
  return `<span class="badge ${cls}">${status || '—'}</span>`;
}

/* ====== الاتصال بالـ API (مع دعم العمل بدون انترنت) ====== */
const WRITE_ACTIONS = ['submitRequest', 'setPrice', 'decideRequest', 'updateInventory'];

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

async function syncQueue() {
  const q = getQueue();
  if (!q.length) { updateOfflineBanner(); return; }
  const remaining = [];
  for (const item of q) {
    try {
      const payload = Object.assign({ action: item.action }, item.data);
      const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json.success) remaining.push(item);
    } catch (e) {
      remaining.push(item);
    }
  }
  saveQueue(remaining);
  updateOfflineBanner();
  if (remaining.length < q.length) {
    toast('تمت مزامنة البيانات المحفوظة محلياً ✓', 'success');
    if (typeof window.refreshCurrentView === 'function') window.refreshCurrentView();
  }
}

function updateOfflineBanner() {
  const banner = document.getElementById('offlineBanner');
  if (!banner) return;
  const q = getQueue();
  if (!navigator.onLine) {
    banner.textContent = 'أنت غير متصل بالإنترنت — أي بيانات تدخلها رح تنحفظ وتترسل تلقائياً أول ما يرجع النت.';
    banner.classList.add('show');
  } else if (q.length > 0) {
    banner.textContent = `جاري مزامنة ${q.length} عملية محفوظة محلياً...`;
    banner.classList.add('show');
    syncQueue();
  } else {
    banner.classList.remove('show');
  }
}

window.addEventListener('online', updateOfflineBanner);
window.addEventListener('offline', updateOfflineBanner);
setInterval(updateOfflineBanner, 15000);

/* ====== تسجيل الدخول ====== */
async function handleLogin(e) {
  e.preventDefault();
  const account = document.getElementById('accountSelect').value;
  const password = document.getElementById('passwordInput').value;
  const btn = document.getElementById('loginBtn');
  const errBox = document.getElementById('loginError');
  errBox.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = 'جاري التحقق... <span class="spinner"></span>';
  try {
    const result = await apiCall('login', { account: account, password: password });
    if (result.success) {
      setSession({ role: result.role });
      renderApp();
    } else {
      errBox.textContent = result.message || 'بيانات الدخول غير صحيحة';
      errBox.classList.remove('hidden');
    }
  } catch (err) {
    errBox.textContent = 'تعذر الاتصال بالخادم. تأكد من الإنترنت وحاول مرة ثانية.';
    errBox.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'تسجيل الدخول';
  }
}

function handleLogout() {
  clearSession();
  renderApp();
}

/* ====== عرض التطبيق حسب الدور ====== */
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
  document.getElementById('whoAmI').textContent = session.role;

  const content = document.getElementById('appContent');
  if (FACTORY_ROLES.indexOf(session.role) !== -1) {
    renderFactoryView(content, session.role);
  } else if (session.role === 'موظف المشتريات') {
    renderPurchasingView(content);
  } else if (session.role === 'المدير') {
    renderManagerView(content);
  }
  updateOfflineBanner();
}

/* ====== واجهة موظف المصنع ====== */
async function renderFactoryView(content, branch) {
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
              <input type="text" id="materialSelect" list="materialSuggestions" placeholder="اكتب اسم المادة" required>
              <datalist id="materialSuggestions"></datalist>
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
          <input type="text" id="invMaterialSelect" list="materialSuggestions" placeholder="اكتب اسم المادة" required>
          <input type="number" id="invQtyInput" placeholder="الكمية الحالية" min="0" required>
          <button type="submit" class="btn-secondary">حفظ التحديث</button>
        </form>
        <div id="invWrap" class="table-wrap" style="margin-top:18px"><div class="empty-state">جاري التحميل...</div></div>
      </div>
    </div>
  `;

  setupTabs();

  refreshMaterialSuggestions(branch);

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
        toast(result.queued ? 'اتحفظ الطلب محلياً وبيترسل أول ما يرجع النت' : 'تم إرسال الطلب بنجاح ✓', 'success');
        e.target.reset();
        loadMyRequests(branch);
        refreshMaterialSuggestions(branch);
      } else {
        toast(result.message || 'صار خطأ، حاول مرة ثانية', 'error');
      }
    } catch (err) {
      toast('تعذر الاتصال بالخادم', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'إرسال الطلب';
    }
  });

  document.getElementById('invForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      branch: branch,
      material: document.getElementById('invMaterialSelect').value,
      quantity: document.getElementById('invQtyInput').value
    };
    const result = await apiCall('updateInventory', payload);
    if (result.success) {
      toast(result.queued ? 'اتحفظ التحديث محلياً' : 'تم تحديث الجرد ✓', 'success');
      e.target.reset();
      loadInventory(branch);
      refreshMaterialSuggestions(branch);
    } else {
      toast(result.message || 'صار خطأ', 'error');
    }
  });

  loadMyRequests(branch);
  loadInventory(branch);

  window.refreshCurrentView = () => { loadMyRequests(branch); loadInventory(branch); };
}

async function refreshMaterialSuggestions(branch) {
  const list = document.getElementById('materialSuggestions');
  if (!list) return;
  const names = new Set();
  try {
    const reqResult = await apiCall('getRequests', { role: branch, branch: branch });
    (reqResult.data || []).forEach(r => { if (r['المادة']) names.add(r['المادة']); });
  } catch (e) {}
  try {
    const invResult = await apiCall('getInventory', { branch: branch });
    (invResult.data || []).forEach(r => { if (r['المادة']) names.add(r['المادة']); });
  } catch (e) {}
  list.innerHTML = Array.from(names).map(n => `<option value="${n}"></option>`).join('');
}

async function loadMyRequests(branch) {
  const wrap = document.getElementById('myRequestsWrap');
  if (!wrap) return;
  try {
    const result = await apiCall('getRequests', { role: branch, branch: branch });
    const rows = (result.data || []).slice().reverse();
    if (!rows.length) { wrap.innerHTML = '<div class="empty-state">ما في طلبات بعد</div>'; return; }
    wrap.innerHTML = `<table><thead><tr>
      <th>رقم الطلب</th><th>التاريخ</th><th>المادة</th><th>الكمية</th><th>الحالة</th>
    </tr></thead><tbody>${rows.map(r => `
      <tr>
        <td>${r['رقم الطلب']}</td>
        <td>${fmtDate(r['التاريخ'])}</td>
        <td>${r['المادة']}</td>
        <td>${r['الكمية']} ${r['الوحدة'] || ''}</td>
        <td>${statusBadge(r['الحالة'])}</td>
      </tr>`).join('')}</tbody></table>`;
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">تعذر تحميل الطلبات، تحقق من الإنترنت</div>';
  }
}

async function loadInventory(branch) {
  const wrap = document.getElementById('invWrap');
  if (!wrap) return;
  try {
    const result = await apiCall('getInventory', { branch: branch });
    const rows = result.data || [];
    if (!rows.length) { wrap.innerHTML = '<div class="empty-state">ما في بيانات جرد بعد</div>'; return; }
    wrap.innerHTML = `<table><thead><tr>
      <th>المادة</th><th>الكمية الحالية</th><th>آخر تحديث</th>
    </tr></thead><tbody>${rows.map(r => `
      <tr><td>${r['المادة']}</td><td>${r['الكمية الحالية']}</td><td>${fmtDate(r['آخر تحديث'])}</td></tr>
    `).join('')}</tbody></table>`;
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">تعذر تحميل الجرد</div>';
  }
}

/* ====== واجهة موظف المشتريات ====== */
async function renderPurchasingView(content) {
  content.innerHTML = `
    <div class="card">
      <h2>الطلبات الجديدة <small>بانتظار تحديد السعر والمورد</small></h2>
      <div id="pendingWrap" class="table-wrap"><div class="empty-state">جاري التحميل...</div></div>
    </div>
  `;
  const materials = await loadMaterials();
  const suppliers = await loadSuppliers();
  await loadPendingForPurchasing(materials, suppliers);
  window.refreshCurrentView = () => loadPendingForPurchasing(materials, suppliers);
}

async function loadPendingForPurchasing(materials, suppliers) {
  const wrap = document.getElementById('pendingWrap');
  try {
    const result = await apiCall('getRequests', { role: 'موظف المشتريات' });
    const rows = result.data || [];
    if (!rows.length) { wrap.innerHTML = '<div class="empty-state">ما في طلبات جديدة حالياً</div>'; return; }

    const supplierOptions = suppliers.map(s => `<option value="${s['اسم المورد']}">${s['اسم المورد']}</option>`).join('');

    wrap.innerHTML = `<table><thead><tr>
      <th>رقم الطلب</th><th>الفرع</th><th>المادة</th><th>الكمية</th><th>المورد</th><th>السعر</th><th></th>
    </tr></thead><tbody>${rows.map(r => {
      const defaultSupplier = (materials.find(m => m['اسم المادة'] === r['المادة']) || {})['المورد الافتراضي'] || '';
      return `<tr data-id="${r['رقم الطلب']}">
        <td>${r['رقم الطلب']}</td>
        <td>${r['الفرع']}</td>
        <td>${r['المادة']}</td>
        <td>${r['الكمية']} ${r['الوحدة'] || ''}</td>
        <td><select class="supplierSelect">${supplierOptions}</select></td>
        <td><input type="number" class="priceInput" placeholder="السعر" min="0" style="width:100px"></td>
        <td><button class="btn-primary confirmPriceBtn" style="white-space:nowrap">تأكيد</button></td>
      </tr>`;
    }).join('')}</tbody></table>`;

    wrap.querySelectorAll('tr[data-id]').forEach(tr => {
      const id = tr.getAttribute('data-id');
      const defaultSupplier = tr.querySelector('.supplierSelect');
      const materialName = tr.children[2].textContent;
      const mat = materials.find(m => m['اسم المادة'] === materialName);
      if (mat && mat['المورد الافتراضي']) defaultSupplier.value = mat['المورد الافتراضي'];

      tr.querySelector('.confirmPriceBtn').addEventListener('click', async () => {
        const supplier = tr.querySelector('.supplierSelect').value;
        const price = tr.querySelector('.priceInput').value;
        if (!price) { toast('لازم تدخل السعر أول', 'error'); return; }
        const result = await apiCall('setPrice', { requestId: id, supplier: supplier, price: price });
        if (result.success) {
          toast(result.queued ? 'اتحفظ محلياً وبيترسل لاحقاً' : 'تم إرسال الطلب للمدير ✓', 'success');
          loadPendingForPurchasing(materials, suppliers);
        } else {
          toast(result.message || 'صار خطأ', 'error');
        }
      });
    });
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">تعذر تحميل الطلبات</div>';
  }
}

/* ====== واجهة المدير ====== */
async function renderManagerView(content) {
  content.innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" data-tab="review">بانتظار الموافقة</button>
      <button class="tab-btn" data-tab="history">سجل الطلبات</button>
      <button class="tab-btn" data-tab="finance">المالية</button>
    </div>
    <div id="tabReview" class="tab-panel">
      <div class="card"><h2>طلبات بانتظار موافقتك</h2>
        <div id="reviewWrap" class="table-wrap"><div class="empty-state">جاري التحميل...</div></div>
      </div>
    </div>
    <div id="tabHistory" class="tab-panel hidden">
      <div class="card"><h2>كل الطلبات المقررة</h2>
        <div id="historyWrap" class="table-wrap"><div class="empty-state">جاري التحميل...</div></div>
      </div>
    </div>
    <div id="tabFinance" class="tab-panel hidden">
      <div class="card"><h2>سجل المالية <small>خاص بالمدير فقط</small></h2>
        <div id="financeWrap" class="table-wrap"><div class="empty-state">جاري التحميل...</div></div>
      </div>
    </div>
  `;
  setupTabs();
  await loadManagerData();
  window.refreshCurrentView = loadManagerData;
}

async function loadManagerData() {
  const result = await apiCall('getRequests', { role: 'المدير' });
  const rows = result.data || [];
  const pending = rows.filter(r => r['الحالة'] === 'قيد موافقة المدير');
  const decided = rows.filter(r => r['الحالة'] !== 'قيد موافقة المدير');

  const reviewWrap = document.getElementById('reviewWrap');
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
      tr.querySelector('.rejectBtn').addEventListener('click', () => {
        const note = prompt('سبب الرفض (اختياري):') || '';
        decide(id, 'مرفوض', note);
      });
    });
  }

  const historyWrap = document.getElementById('historyWrap');
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

  await loadFinance();
}

async function decide(requestId, decision, note) {
  const result = await apiCall('decideRequest', { requestId: requestId, decision: decision, note: note || '' });
  if (result.success) {
    toast(result.queued ? 'اتحفظ القرار محلياً' : (decision === 'تمت الموافقة' ? 'تمت الموافقة على الطلب ✓' : 'تم رفض الطلب'), decision === 'تمت الموافقة' ? 'success' : 'error');
    loadManagerData();
  } else {
    toast(result.message || 'صار خطأ', 'error');
  }
}

async function loadFinance() {
  const wrap = document.getElementById('financeWrap');
  if (!wrap) return;
  try {
    const result = await apiCall('getRequests', { role: 'المدير' });
    // Finance rows come from a separate sheet; fetch via dedicated call
  } catch (e) {}
  try {
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getFinance' }) });
  } catch (e) {}
  // fallback simple fetch of finance sheet through generic call
  try {
    const result = await apiCall('getFinance', {});
    const rows = result.data || [];
    if (!rows.length) { wrap.innerHTML = '<div class="empty-state">ما في سجلات مالية بعد</div>'; return; }
    wrap.innerHTML = `<table><thead><tr>
      <th>رقم الطلب</th><th>المورد</th><th>المادة</th><th>السعر</th><th>تاريخ الموافقة</th>
    </tr></thead><tbody>${rows.slice().reverse().map(r => `
      <tr><td>${r['رقم الطلب']}</td><td>${r['المورد']}</td><td>${r['المادة']}</td><td>${r['السعر']}</td><td>${fmtDate(r['تاريخ الموافقة'])}</td></tr>
    `).join('')}</tbody></table>`;
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">تعذر تحميل سجل المالية</div>';
  }
}

/* ====== تحميل بيانات مشتركة (مواد وموردين) مع تخزين مؤقت ====== */
async function loadMaterials() {
  try {
    const result = await apiCall('getMaterials', {});
    setCache('materials', result.data || []);
    return result.data || [];
  } catch (e) {
    return getCache().materials || [];
  }
}
async function loadSuppliers() {
  try {
    const result = await apiCall('getSuppliers', {});
    setCache('suppliers', result.data || []);
    return result.data || [];
  } catch (e) {
    return getCache().suppliers || [];
  }
}

/* ====== تبويبات عامة ====== */
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

/* ====== بدء التشغيل ====== */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  renderApp();
  updateOfflineBanner();
});
