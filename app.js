/**
 * Labour Registration & Service Period Calculation System
 * App JavaScript Engine
 */

// ---- Local data storage (via Electron main process, stored in a JSON file
// on this laptop only — no internet, no cloud, nothing leaves this machine) ----
async function remoteGet(key) {
  return await window.electronAPI.getKV(key);
}

async function remoteSet(key, value) {
  return await window.electronAPI.setKV(key, value);
}

// User & Authentication Storage Keys
const USERS_STORAGE_KEY = 'HR_USERS_V1';
const SESSION_STORAGE_KEY = 'HR_CURRENT_USER_V1';

// App State
let labourRecords = [];
let systemUsers = [];
let currentUser = null;
let sortColumn = 'epfNumber';
let sortAscending = true;

// Default Admin Account Credentials
const DEFAULT_ADMIN = {
  id: 'usr_admin',
  username: 'admin',
  password: 'admin123',
  fullName: 'System Administrator',
  email: 'admin@rmp.lk',
  role: 'Admin',
  createdAt: '2026-01-01'
};

// DOM Elements
const labourModal = document.getElementById('labourModal');
const labourForm = document.getElementById('labourForm');
const modalTitle = document.getElementById('modalTitle');
const editRecordId = document.getElementById('editRecordId');
const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');
const recordCountInfo = document.getElementById('recordCountInfo');

// Input Controls
const inputJoinedDate = document.getElementById('joinedDate');
const inputResignDate = document.getElementById('resignDate');
const inputFirstAppraisal = document.getElementById('firstAppraisalDate');
const inputSecondAppraisal = document.getElementById('secondAppraisalDate');
const previewAppraisal1 = document.getElementById('previewAppraisal1');
const previewAppraisal2 = document.getElementById('previewAppraisal2');
const previewServicePeriod = document.getElementById('previewServicePeriod');

// Filters & Search
const searchInput = document.getElementById('searchInput');
const filterSection = document.getElementById('filterSection');
const filterGender = document.getElementById('filterGender');
const filterStatus = document.getElementById('filterStatus');
const btnClearFilters = document.getElementById('btnClearFilters');

// Stats Elements
const statTotalLabour = document.getElementById('statTotalLabour');
const statActiveLabour = document.getElementById('statActiveLabour');
const statResignedLabour = document.getElementById('statResignedLabour');
const statConfirmedLabour = document.getElementById('statConfirmedLabour');

// Buttons
const btnNewLabour = document.getElementById('btnNewLabour');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancelModal = document.getElementById('btnCancelModal');
const btnSaveLabour = document.getElementById('btnSaveLabour');
const btnExportExcel = document.getElementById('btnExportExcel');

// Tab & Dashboard Elements
let chart1Instance = null;
let chart2Instance = null;
let chartSectionActiveInstance = null;
let chartSectionResignedInstance = null;
let activePage = 'directoryPage';

const tabDirectory = document.getElementById('tabDirectory');
const tabAppraisals = document.getElementById('tabAppraisals');
const tabResigned = document.getElementById('tabResigned');
const tabDueBadge = document.getElementById('tabDueBadge');
const tabResignedBadge = document.getElementById('tabResignedBadge');

const directoryPage = document.getElementById('directoryPage');
const appraisalsPage = document.getElementById('appraisalsPage');
const resignedPage = document.getElementById('resignedPage');

// Resign Modal Controls
const resignModal = document.getElementById('resignModal');
const btnCloseResignModal = document.getElementById('btnCloseResignModal');
const btnCancelResignModal = document.getElementById('btnCancelResignModal');
const btnConfirmResignModal = document.getElementById('btnConfirmResignModal');
const inputResignDateModal = document.getElementById('inputResignDateModal');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadRecordsFromStorage();
    await loadUsersFromStorage();
  } catch (e) {
    console.error('Could not load local data', e);
    showToast('Could not load saved data.', 'error');
  }
  initEventListeners();
  checkCurrentSession();
  renderTable();
  updateSectionFilterOptions();
  updateAppraisalDueBadge();
});

const STORAGE_KEY = 'HR_LABOUR_RECORDS_V1';

async function loadRecordsFromStorage() {
  const data = await remoteGet(STORAGE_KEY);
  labourRecords = Array.isArray(data) ? data : [];
}

async function saveRecordsToStorage() {
  try {
    await remoteSet(STORAGE_KEY, labourRecords);
  } catch (e) {
    console.error('Failed to save records', e);
    showToast('Could not save data.', 'error');
  }
  updateSectionFilterOptions();
  updateStats();
}

// --- Authentication & User Management Storage ---
async function loadUsersFromStorage() {
  const data = await remoteGet(USERS_STORAGE_KEY);
  if (Array.isArray(data) && data.length) {
    systemUsers = data;
    if (!systemUsers.find(u => u.username === 'admin')) {
      systemUsers.unshift(DEFAULT_ADMIN);
    }
  } else {
    systemUsers = [DEFAULT_ADMIN];
    await remoteSet(USERS_STORAGE_KEY, systemUsers);
  }
}

async function saveUsersToStorage() {
  try {
    await remoteSet(USERS_STORAGE_KEY, systemUsers);
  } catch (e) {
    console.error('Failed to save users', e);
    showToast('Could not save data.', 'error');
  }
}

function checkCurrentSession() {
  const sessionData = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
  if (sessionData) {
    try {
      currentUser = JSON.parse(sessionData);
      showAppScreen();
    } catch (e) {
      showLoginScreen();
    }
  } else {
    showLoginScreen();
  }
}

function handleLogin(e) {
  if (e) e.preventDefault();
  const usernameInput = (document.getElementById('loginUsername')?.value || '').trim();
  const passwordInput = document.getElementById('loginPassword')?.value || '';
  const alertEl = document.getElementById('loginErrorAlert');
  const alertMsg = document.getElementById('loginErrorMsg');

  if (alertEl) alertEl.style.display = 'none';

  if (!usernameInput || !passwordInput) {
    if (alertMsg) alertMsg.textContent = 'Please enter both username and password.';
    if (alertEl) alertEl.style.display = 'flex';
    return;
  }

  const user = systemUsers.find(u => 
    (u.username.toLowerCase() === usernameInput.toLowerCase() || (u.email && u.email.toLowerCase() === usernameInput.toLowerCase())) &&
    u.password === passwordInput
  );

  if (user) {
    currentUser = user;
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();
    showAppScreen();
    showToast(`Welcome back, ${user.fullName || user.username}!`, 'success');
  } else {
    if (alertMsg) alertMsg.textContent = 'Invalid username or password. Please try again.';
    if (alertEl) alertEl.style.display = 'flex';
  }
}

function handleLogout() {
  currentUser = null;
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
  showLoginScreen();
  showToast('Logged out successfully', 'info');
}

function showLoginScreen() {
  const loginPage = document.getElementById('loginPage');
  const appContainer = document.getElementById('appContainer');
  if (loginPage) loginPage.style.display = 'flex';
  if (appContainer) appContainer.style.display = 'none';
}

function showAppScreen() {
  const loginPage = document.getElementById('loginPage');
  const appContainer = document.getElementById('appContainer');
  if (loginPage) loginPage.style.display = 'none';
  if (appContainer) appContainer.style.display = 'flex';
  updateHeaderUserProfile();
  applyRolePermissions();
  renderUsersTable();
  updateUserStats();
}

function updateHeaderUserProfile() {
  if (!currentUser) return;
  const avatarEl = document.getElementById('userAvatar');
  const nameEl = document.getElementById('headerUserName');
  const roleEl = document.getElementById('headerUserRole');

  if (avatarEl) avatarEl.textContent = (currentUser.fullName || currentUser.username).charAt(0).toUpperCase();
  if (nameEl) nameEl.textContent = currentUser.fullName || currentUser.username;
  if (roleEl) roleEl.textContent = currentUser.role || 'User';
}

function applyRolePermissions() {
  if (!currentUser) return;
  const role = currentUser.role;

  const btnNewLabourEl = document.getElementById('btnNewLabour');
  const tabUsersEl = document.getElementById('tabUsers');

  if (role === 'Viewer') {
    if (btnNewLabourEl) btnNewLabourEl.style.display = 'none';
    if (tabUsersEl) tabUsersEl.style.display = 'none';
  } else if (role === 'HR Staff') {
    if (btnNewLabourEl) btnNewLabourEl.style.display = 'inline-flex';
    if (tabUsersEl) tabUsersEl.style.display = 'none'; // Only Admin can manage system users
  } else {
    // Admin: Full access
    if (btnNewLabourEl) btnNewLabourEl.style.display = 'inline-flex';
    if (tabUsersEl) tabUsersEl.style.display = 'inline-flex';
  }
}

// --- User Management CRUD Logic ---
function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  const emptyEl = document.getElementById('usersEmptyState');
  const countInfo = document.getElementById('userRecordCountInfo');
  const searchVal = (document.getElementById('searchUserInput')?.value || '').toLowerCase();
  const roleVal = document.getElementById('filterUserRole')?.value || '';

  if (!tbody) return;

  const filtered = systemUsers.filter(u => {
    const matchSearch = !searchVal || 
      u.username.toLowerCase().includes(searchVal) ||
      u.fullName.toLowerCase().includes(searchVal) ||
      (u.email && u.email.toLowerCase().includes(searchVal));
    const matchRole = !roleVal || u.role === roleVal;
    return matchSearch && matchRole;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
  } else {
    if (emptyEl) emptyEl.style.display = 'none';
    filtered.forEach(u => {
      let roleBadgeClass = 'badge-role-viewer';
      if (u.role === 'Admin') roleBadgeClass = 'badge-role-admin';
      if (u.role === 'HR Staff') roleBadgeClass = 'badge-role-hr';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="cell-epf">${escapeHtml(u.username)}</td>
        <td style="font-weight: 700;">${escapeHtml(u.fullName)}</td>
        <td>${escapeHtml(u.email || '-')}</td>
        <td><span class="badge ${roleBadgeClass}">${escapeHtml(u.role)}</span></td>
        <td>${escapeHtml(u.createdAt || '-')}</td>
        <td><span class="badge badge-done">Active</span></td>
        <td style="text-align: center;">
          <button class="btn-icon btn-edit-user" data-id="${u.id}" title="Edit User">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          ${u.username === 'admin' ? '' : `
          <button class="btn-icon btn-delete-user" data-id="${u.id}" title="Delete User" style="color: var(--accent-red);">
            <i class="fa-solid fa-trash"></i>
          </button>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  if (countInfo) {
    countInfo.textContent = `Showing ${filtered.length} of ${systemUsers.length} system users`;
  }
}

function updateUserStats() {
  const statTotalUsers = document.getElementById('statTotalUsers');
  const statAdminCount = document.getElementById('statAdminCount');
  const statHRCount = document.getElementById('statHRCount');

  if (statTotalUsers) statTotalUsers.textContent = systemUsers.length;
  if (statAdminCount) statAdminCount.textContent = systemUsers.filter(u => u.role === 'Admin').length;
  if (statHRCount) statHRCount.textContent = systemUsers.filter(u => u.role === 'HR Staff').length;
}

function openUserModal(isEdit = false, userRecord = null) {
  const modal = document.getElementById('userModal');
  const form = document.getElementById('userForm');
  const title = document.getElementById('userModalTitle');
  const editId = document.getElementById('editUserId');

  if (!modal || !form) return;
  form.reset();

  if (isEdit && userRecord) {
    title.innerHTML = '<i class="fa-solid fa-user-pen"></i> Edit System User';
    editId.value = userRecord.id;
    document.getElementById('userFullName').value = userRecord.fullName;
    document.getElementById('userUsername').value = userRecord.username;
    document.getElementById('userEmail').value = userRecord.email || '';
    document.getElementById('userPassword').value = userRecord.password;
    document.getElementById('userRole').value = userRecord.role;
  } else {
    title.innerHTML = '<i class="fa-solid fa-user-plus"></i> Register New System User';
    editId.value = '';
  }
  modal.classList.add('active');
}

function closeUserModal() {
  const modal = document.getElementById('userModal');
  if (modal) modal.classList.remove('active');
}

function saveUserRecord() {
  const editId = document.getElementById('editUserId').value;
  const fullName = document.getElementById('userFullName').value.trim();
  const username = document.getElementById('userUsername').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const password = document.getElementById('userPassword').value;
  const role = document.getElementById('userRole').value;

  if (!fullName || !username || !password) {
    showToast('Please fill in all required user fields', 'error');
    return;
  }

  // Check duplicate username
  const existing = systemUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== editId);
  if (existing) {
    showToast('Username already exists. Please choose a different username.', 'error');
    return;
  }

  if (editId) {
    const idx = systemUsers.findIndex(u => u.id === editId);
    if (idx !== -1) {
      systemUsers[idx] = {
        ...systemUsers[idx],
        fullName,
        username,
        email,
        password,
        role
      };
      showToast(`User ${username} updated successfully!`, 'success');
    }
  } else {
    const newUser = {
      id: 'usr_' + Date.now(),
      fullName,
      username,
      email,
      password,
      role,
      createdAt: formatDateToInput(new Date())
    };
    systemUsers.push(newUser);
    showToast(`User ${username} registered successfully!`, 'success');
  }

  saveUsersToStorage();
  closeUserModal();
  renderUsersTable();
  updateUserStats();
}

function deleteUserRecord(userId) {
  const user = systemUsers.find(u => u.id === userId);
  if (!user) return;

  if (user.username === 'admin') {
    showToast('Default admin account cannot be deleted', 'error');
    return;
  }

  if (confirm(`Are you sure you want to delete user account "${user.username}"?`)) {
    systemUsers = systemUsers.filter(u => u.id !== userId);
    saveUsersToStorage();
    renderUsersTable();
    updateUserStats();
    showToast(`User ${user.username} deleted`, 'info');
  }
}

// --- Date & Calculation Utilities ---

/**
 * Returns number of days in a given month of a year
 */
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
function formatDateToInput(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Adds months to a given date string (YYYY-MM-DD)
 */
function addMonthsToDateStr(dateStr, monthsToAdd) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) - 1; // 0-indexed
  let day = parseInt(parts[2], 10);

  const targetDate = new Date(year, month + monthsToAdd, day);
  
  // Handle month edge cases (e.g. Jan 31 + 1 month)
  if (targetDate.getDate() !== day) {
    targetDate.setDate(0); // clamp to last day of previous month
  }
  
  return formatDateToInput(targetDate);
}

/**
 * Calculates exact Service Period in Years, Months, and Days
 * Matching exact screenshot logic: "0 Years, 8 Months, 23 Days"
 */
function calculateServicePeriod(joinedDateStr, resignDateStr) {
  if (!joinedDateStr) return '0 Years, 0 Months, 0 Days';

  const startParts = joinedDateStr.split('-');
  if (startParts.length !== 3) return '0 Years, 0 Months, 0 Days';

  const startYear = parseInt(startParts[0], 10);
  const startMonth = parseInt(startParts[1], 10);
  const startDay = parseInt(startParts[2], 10);

  let endYear, endMonth, endDay;

  if (resignDateStr) {
    const endParts = resignDateStr.split('-');
    if (endParts.length !== 3) return '0 Years, 0 Months, 0 Days';
    endYear = parseInt(endParts[0], 10);
    endMonth = parseInt(endParts[1], 10);
    endDay = parseInt(endParts[2], 10);
  } else {
    // Current date (Today)
    const today = new Date();
    endYear = today.getFullYear();
    endMonth = today.getMonth() + 1;
    endDay = today.getDate();
  }

  let days = endDay - startDay;
  let months = endMonth - startMonth;
  let years = endYear - startYear;

  if (days < 0) {
    months -= 1;
    let prevMonthYear = endMonth === 1 ? endYear - 1 : endYear;
    let prevMonth = endMonth === 1 ? 12 : endMonth - 1;
    days += getDaysInMonth(prevMonthYear, prevMonth);
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) return '0 Years, 0 Months, 0 Days';

  return `${years} Years, ${months} Months, ${days} Days`;
}

// --- Live Form Calculation Handler ---
function updateLiveCalculations(forceRecalculateAppraisals = false) {
  const joinedVal = inputJoinedDate.value;
  const resignVal = inputResignDate.value;

  if (joinedVal && joinedVal.split('-').length === 3) {
    const auto1st = addMonthsToDateStr(joinedVal, 1);
    const auto2nd = addMonthsToDateStr(joinedVal, 3);

    if (forceRecalculateAppraisals || !inputFirstAppraisal.value) {
      inputFirstAppraisal.value = auto1st;
    }
    if (forceRecalculateAppraisals || !inputSecondAppraisal.value) {
      inputSecondAppraisal.value = auto2nd;
    }

    previewAppraisal1.textContent = inputFirstAppraisal.value || auto1st || '-';
    previewAppraisal2.textContent = inputSecondAppraisal.value || auto2nd || '-';

    // Calculate Service Period
    const serviceStr = calculateServicePeriod(joinedVal, resignVal);
    previewServicePeriod.textContent = serviceStr;
  } else {
    if (forceRecalculateAppraisals) {
      inputFirstAppraisal.value = '';
      inputSecondAppraisal.value = '';
    }
    previewAppraisal1.textContent = inputFirstAppraisal.value || '-';
    previewAppraisal2.textContent = inputSecondAppraisal.value || '-';
    previewServicePeriod.textContent = calculateServicePeriod(joinedVal, resignVal);
  }
}

// --- UI Rendering ---
function renderTable() {
  const query = searchInput.value.toLowerCase().trim();
  const selectedSection = filterSection.value;
  const selectedGender = filterGender.value;
  const selectedStatus = filterStatus.value;

  // Active labourers only for main Directory table
  const activeLabourers = labourRecords.filter(r => !r.resignDate);

  // Filter records
  let filtered = activeLabourers.filter(item => {
    // Search query
    const matchQuery = !query || [
      item.epfNumber,
      item.nameWithInitials,
      item.firstName,
      item.lastName,
      item.designation,
      item.jobRole,
      item.section
    ].some(val => (val || '').toLowerCase().includes(query));

    // Section Filter
    const matchSection = !selectedSection || item.section === selectedSection;

    // Gender Filter
    const matchGender = !selectedGender || item.gender === selectedGender;

    // Status Filter (Confirmation Letter)
    let matchStatus = true;
    if (selectedStatus === 'Done') matchStatus = item.confirmationLetter === 'Done';
    else if (selectedStatus === 'Pending') matchStatus = item.confirmationLetter === 'Pending';

    return matchQuery && matchSection && matchGender && matchStatus;
  });

  // Sort records
  filtered.sort((a, b) => {
    let valA = a[sortColumn] || '';
    let valB = b[sortColumn] || '';

    // Handle numeric EPF sorting
    if (sortColumn === 'epfNumber') {
      const numA = parseInt(valA, 10);
      const numB = parseInt(valB, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortAscending ? numA - numB : numB - numA;
      }
    }

    if (valA < valB) return sortAscending ? -1 : 1;
    if (valA > valB) return sortAscending ? 1 : -1;
    return 0;
  });

  // Clear tbody
  tableBody.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
    
    filtered.forEach(record => {
      const tr = document.createElement('tr');
      const servicePeriodStr = calculateServicePeriod(record.joinedDate, record.resignDate);
      const confirmBadgeClass = record.confirmationLetter === 'Done' ? 'badge-ok' : 'badge-duesoon';

      tr.innerHTML = `
        <td class="cell-epf">${escapeHtml(record.epfNumber || '-')}</td>
        <td class="cell-gender">${escapeHtml(record.gender || '-')}</td>
        <td><strong>${escapeHtml(record.nameWithInitials || '-')}</strong></td>
        <td>${escapeHtml(record.firstName || '-')}</td>
        <td>${escapeHtml(record.lastName || '-')}</td>
        <td>${escapeHtml(record.birthDate || '-')}</td>
        <td>${escapeHtml(record.joinedDate || '-')}</td>
        
        <!-- Appraisal & Service Period (Blue Block Headers in UI) -->
        <td>${escapeHtml(record.firstAppraisalDate || '-')}</td>
        <td><span class="cell-service-period">${escapeHtml(servicePeriodStr)}</span></td>
        <td style="text-align: center;">${escapeHtml(record.firstAppraisalMarks || '-')}</td>
        <td>${escapeHtml(record.secondAppraisalDate || '-')}</td>
        <td style="text-align: center;">${escapeHtml(record.secondAppraisalMarks || '-')}</td>
        <td class="${record.resignDate ? 'cell-resigned' : ''}">${escapeHtml(record.resignDate || '-')}</td>
        <td><span class="badge ${confirmBadgeClass}">${escapeHtml(record.confirmationLetter || 'Pending')}</span></td>

        <!-- Job & Section -->
        <td>${escapeHtml(record.designation || '-')}</td>
        <td>${escapeHtml(record.jobRole || '-')}</td>
        <td>${escapeHtml(record.section || '-')}</td>

        <!-- Actions -->
        <td style="text-align: center; white-space: nowrap;">
          <button class="btn-icon btn-edit" data-id="${record.id}" title="Edit Record">
            <i class="fa-solid fa-pen-to-square" style="color: var(--accent-blue);"></i>
          </button>
          <button class="btn-icon btn-resign" data-id="${record.id}" title="Mark as Resigned">
            <i class="fa-solid fa-user-minus" style="color: var(--accent-orange);"></i>
          </button>
          <button class="btn-icon btn-delete" data-id="${record.id}" title="Delete Record">
            <i class="fa-solid fa-trash-can" style="color: var(--accent-red);"></i>
          </button>
        </td>
      `;

      tableBody.appendChild(tr);
    });
  }

  recordCountInfo.textContent = `Showing ${filtered.length} of ${activeLabourers.length} active labourers`;
  updateStats();
}

const DEFAULT_SECTIONS = [
  'Yard C Wet C',
  'Yard A',
  'Wet A',
  'Yard B',
  'Wet B',
  'Milk',
  'Dry',
  'Oil',
  'Maintanace',
  '55 Estate',
  'Driver',
  'Yara'
];

function updateSectionFilterOptions() {
  const customSections = labourRecords.map(r => r.section).filter(Boolean);
  const sections = Array.from(new Set([...DEFAULT_SECTIONS, ...customSections])).sort();

  [filterSection, document.getElementById('filterResignedSection')].forEach(selectEl => {
    if (!selectEl) return;
    const currentVal = selectEl.value;
    selectEl.innerHTML = '<option value="">-- All Sections --</option>';
    sections.forEach(sec => {
      const opt = document.createElement('option');
      opt.value = sec;
      opt.textContent = sec;
      if (sec === currentVal) opt.selected = true;
      selectEl.appendChild(opt);
    });
  });
}

function updateStats() {
  const total = labourRecords.length;
  const active = labourRecords.filter(r => !r.resignDate).length;
  const resigned = labourRecords.filter(r => !!r.resignDate).length;
  const confirmed = labourRecords.filter(r => r.confirmationLetter === 'Done').length;

  statTotalLabour.textContent = total;
  statActiveLabour.textContent = active;
  statResignedLabour.textContent = resigned;
  statConfirmedLabour.textContent = confirmed;

  if (tabResignedBadge) {
    tabResignedBadge.textContent = resigned;
    tabResignedBadge.style.display = resigned > 0 ? 'inline-block' : 'none';
  }

  updateAppraisalDueBadge();
}

// --- Appraisal Due & Status Tracking ---
function getAppraisalStatus(dateStr, marks) {
  if (!dateStr) return 'No Date';
  const hasMarks = marks && marks.trim() !== '' && marks.trim() !== '-';
  if (hasMarks) return 'Completed';

  const todayStr = formatDateToInput(new Date());
  if (dateStr < todayStr) return 'Overdue';
  
  // Calculate day difference
  const today = new Date();
  const targetDate = new Date(dateStr);
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
  
  if (diffDays <= 30) return 'Due Soon';
  return 'Upcoming';
}

function updateAppraisalDueBadge() {
  const activeLabourers = labourRecords.filter(r => !r.resignDate);
  let totalPendingDue = 0;
  
  activeLabourers.forEach(r => {
    const status1 = getAppraisalStatus(r.firstAppraisalDate, r.firstAppraisalMarks);
    const status2 = getAppraisalStatus(r.secondAppraisalDate, r.secondAppraisalMarks);

    if (status1 === 'Overdue' || status1 === 'Due Soon') totalPendingDue++;
    if (status2 === 'Overdue' || status2 === 'Due Soon') totalPendingDue++;
  });

  const tabBadge = document.getElementById('tabDueBadge');
  if (tabBadge) {
    tabBadge.textContent = totalPendingDue;
    tabBadge.style.display = totalPendingDue > 0 ? 'inline-block' : 'none';
  }
}

function switchPage(pageId) {
  activePage = pageId;
  const dirPage = document.getElementById('directoryPage');
  const appPage = document.getElementById('appraisalsPage');
  const resPage = document.getElementById('resignedPage');
  const anaPage = document.getElementById('analyticsPage');

  const tabDir = document.getElementById('tabDirectory');
  const tabApp = document.getElementById('tabAppraisals');
  const tabRes = document.getElementById('tabResigned');
  const tabAna = document.getElementById('tabAnalytics');

  if (pageId === 'directoryPage') {
    if (dirPage) dirPage.style.display = 'block';
    if (appPage) appPage.style.display = 'none';
    if (resPage) resPage.style.display = 'none';
    if (anaPage) anaPage.style.display = 'none';
    if (tabDir) tabDir.classList.add('active');
    if (tabApp) tabApp.classList.remove('active');
    if (tabRes) tabRes.classList.remove('active');
    if (tabAna) tabAna.classList.remove('active');
    renderTable();
  } else if (pageId === 'appraisalsPage') {
    if (dirPage) dirPage.style.display = 'none';
    if (appPage) appPage.style.display = 'block';
    if (resPage) resPage.style.display = 'none';
    if (anaPage) anaPage.style.display = 'none';
    if (tabDir) tabDir.classList.remove('active');
    if (tabApp) tabApp.classList.add('active');
    if (tabRes) tabRes.classList.remove('active');
    if (tabAna) tabAna.classList.remove('active');
    renderAppraisalDashboard();
  } else if (pageId === 'resignedPage') {
    if (dirPage) dirPage.style.display = 'none';
    if (appPage) appPage.style.display = 'none';
    if (resPage) resPage.style.display = 'block';
    if (anaPage) anaPage.style.display = 'none';
    if (tabDir) tabDir.classList.remove('active');
    if (tabApp) tabApp.classList.remove('active');
    if (tabRes) tabRes.classList.add('active');
    if (tabAna) tabAna.classList.remove('active');
    renderResignedTable();
  } else if (pageId === 'analyticsPage') {
    if (dirPage) dirPage.style.display = 'none';
    if (appPage) appPage.style.display = 'none';
    if (resPage) resPage.style.display = 'none';
    if (anaPage) anaPage.style.display = 'block';
    if (tabDir) tabDir.classList.remove('active');
    if (tabApp) tabApp.classList.remove('active');
    if (tabRes) tabRes.classList.remove('active');
    if (tabAna) tabAna.classList.add('active');
    renderSectionAnalytics();
  }
}

// --- Section-Wise Analytics & Bar Charts ---
function renderSectionAnalytics() {
  const customSections = labourRecords.map(r => r.section).filter(Boolean);
  const allSections = Array.from(new Set([...DEFAULT_SECTIONS, ...customSections])).sort();

  const sectionDataMap = {};
  allSections.forEach(sec => {
    sectionDataMap[sec] = { active: 0, resigned: 0, total: 0 };
  });

  labourRecords.forEach(r => {
    const sec = r.section || 'Unassigned';
    if (!sectionDataMap[sec]) {
      sectionDataMap[sec] = { active: 0, resigned: 0, total: 0 };
    }
    if (r.resignDate) {
      sectionDataMap[sec].resigned++;
    } else {
      sectionDataMap[sec].active++;
    }
    sectionDataMap[sec].total++;
  });

  // Filter sections that have at least 1 record, or fallback to default sections
  const activeSections = Object.keys(sectionDataMap).filter(sec => sectionDataMap[sec].total > 0);
  const displaySections = activeSections.length > 0 ? activeSections : DEFAULT_SECTIONS;

  const labels = displaySections;
  const activeCounts = displaySections.map(sec => sectionDataMap[sec].active);
  const resignedCounts = displaySections.map(sec => sectionDataMap[sec].resigned);

  // Update Stats Cards on Analytics Page
  const statSectionsCount = document.getElementById('statAnalyticsSectionsCount');
  if (statSectionsCount) statSectionsCount.textContent = activeSections.length;



  // Render Bar Charts
  renderChartSectionActive(labels, activeCounts);
  renderChartSectionResigned(labels, resignedCounts);

  // Render Section Breakdown Table
  const tbody = document.getElementById('bodySectionBreakdown');
  if (tbody) {
    tbody.innerHTML = '';
    displaySections.forEach(sec => {
      const data = sectionDataMap[sec];
      const rate = data.total > 0 ? ((data.resigned / data.total) * 100).toFixed(1) : 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(sec)}</strong></td>
        <td><span class="badge badge-ok">${data.active} Active</span></td>
        <td><span class="badge badge-resigned">${data.resigned} Resigned</span></td>
        <td><strong>${data.total}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>${rate}%</span>
            <div style="flex: 1; max-width: 120px; height: 6px; background: rgba(51, 65, 85, 0.5); border-radius: 999px; overflow: hidden;">
              <div style="width: ${Math.min(rate, 100)}%; height: 100%; background: var(--accent-orange);"></div>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

function renderChartSectionActive(labels, activeCounts) {
  const canvas = document.getElementById('chartSectionActive');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  if (chartSectionActiveInstance) chartSectionActiveInstance.destroy();

  chartSectionActiveInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Active Labourers',
        data: activeCounts,
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: '#94a3b8', font: { family: 'Plus Jakarta Sans' } },
          grid: { color: '#334155' }
        },
        x: {
          ticks: { color: '#f8fafc', font: { family: 'Plus Jakarta Sans', size: 11 } },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderChartSectionResigned(labels, resignedCounts) {
  const canvas = document.getElementById('chartSectionResigned');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  if (chartSectionResignedInstance) chartSectionResignedInstance.destroy();

  chartSectionResignedInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Resigned Labourers',
        data: resignedCounts,
        backgroundColor: '#f97316',
        borderColor: '#ea580c',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: '#94a3b8', font: { family: 'Plus Jakarta Sans' } },
          grid: { color: '#334155' }
        },
        x: {
          ticks: { color: '#f8fafc', font: { family: 'Plus Jakarta Sans', size: 11 } },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// --- Resigned Labour Directory View ---
function renderResignedTable() {
  const resignedRecords = labourRecords.filter(r => !!r.resignDate);
  const searchEl = document.getElementById('searchResignedInput');
  const query = (searchEl ? searchEl.value : '').toLowerCase().trim();
  const selectedSection = document.getElementById('filterResignedSection')?.value || '';
  const selectedGender = document.getElementById('filterResignedGender')?.value || '';

  let filtered = resignedRecords.filter(item => {
    const matchQuery = !query || 
      (item.epfNumber && item.epfNumber.toLowerCase().includes(query)) ||
      (item.nameWithInitials && item.nameWithInitials.toLowerCase().includes(query)) ||
      (item.firstName && item.firstName.toLowerCase().includes(query)) ||
      (item.lastName && item.lastName.toLowerCase().includes(query));

    const matchSection = !selectedSection || item.section === selectedSection;
    const matchGender = !selectedGender || item.gender === selectedGender;

    return matchQuery && matchSection && matchGender;
  });

  // Update Resigned Page Stats
  const totalResigned = resignedRecords.length;
  const totalRegistered = labourRecords.length;
  const ratio = totalRegistered > 0 ? ((totalResigned / totalRegistered) * 100).toFixed(1) : 0;

  const statTotal = document.getElementById('statResignedPageTotal');
  if (statTotal) statTotal.textContent = totalResigned;
  const statRatio = document.getElementById('statResignedActiveRatio');
  if (statRatio) statRatio.textContent = `${ratio}%`;

  const tbody = document.getElementById('resignedTableBody');
  const emptyState = document.getElementById('resignedEmptyState');
  const infoLabel = document.getElementById('resignedRecordCountInfo');

  if (!tbody) return;
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    if (infoLabel) infoLabel.textContent = `Showing 0 of ${totalResigned} resigned entries`;
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (infoLabel) infoLabel.textContent = `Showing ${filtered.length} of ${totalResigned} resigned entries`;

  filtered.forEach(record => {
    const tr = document.createElement('tr');
    const finalService = calculateServicePeriod(record.joinedDate, record.resignDate);

    tr.innerHTML = `
      <td class="cell-epf">${escapeHtml(record.epfNumber)}</td>
      <td>${escapeHtml(record.gender)}</td>
      <td><strong>${escapeHtml(record.nameWithInitials)}</strong></td>
      <td>${escapeHtml(record.joinedDate || '-')}</td>
      <td><span class="badge badge-resigned">${escapeHtml(record.resignDate)}</span></td>
      <td class="cell-service-period">${escapeHtml(finalService)}</td>
      <td>${escapeHtml(record.firstAppraisalMarks || '-')}</td>
      <td>${escapeHtml(record.secondAppraisalMarks || '-')}</td>
      <td>${escapeHtml(record.designation || '-')}</td>
      <td>${escapeHtml(record.section || '-')}</td>
      <td style="text-align: center; white-space: nowrap;">
        <button class="btn btn-sm btn-reactivate btn-reactivate-labour" data-id="${record.id}" title="Re-activate Labourer">
          <i class="fa-solid fa-rotate-left"></i> Re-activate
        </button>
        <button class="btn-icon btn-edit" data-id="${record.id}" title="Edit Record">
          <i class="fa-solid fa-pen-to-square" style="color: var(--accent-blue);"></i>
        </button>
        <button class="btn-icon btn-delete" data-id="${record.id}" title="Delete Record">
          <i class="fa-solid fa-trash-can" style="color: var(--accent-red);"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAppraisalDashboard() {
  const activeLabourers = labourRecords.filter(r => !r.resignDate);

  let c1Overdue = 0, c1DueSoon = 0, c1Completed = 0, c1Upcoming = 0;
  let c2Overdue = 0, c2DueSoon = 0, c2Completed = 0, c2Upcoming = 0;

  const dueList1st = [];
  const dueList2nd = [];

  activeLabourers.forEach(r => {
    // 1st Appraisal
    const s1 = getAppraisalStatus(r.firstAppraisalDate, r.firstAppraisalMarks);
    if (s1 === 'Overdue') { c1Overdue++; dueList1st.push({ record: r, status: s1 }); }
    else if (s1 === 'Due Soon') { c1DueSoon++; dueList1st.push({ record: r, status: s1 }); }
    else if (s1 === 'Completed') { c1Completed++; }
    else if (s1 === 'Upcoming') { c1Upcoming++; }

    // 2nd Appraisal
    const s2 = getAppraisalStatus(r.secondAppraisalDate, r.secondAppraisalMarks);
    if (s2 === 'Overdue') { c2Overdue++; dueList2nd.push({ record: r, status: s2 }); }
    else if (s2 === 'Due Soon') { c2DueSoon++; dueList2nd.push({ record: r, status: s2 }); }
    else if (s2 === 'Completed') { c2Completed++; }
    else if (s2 === 'Upcoming') { c2Upcoming++; }
  });

  // Update KPI Stats Cards on Appraisal Page
  document.getElementById('stat1stOverdue').textContent = c1Overdue;
  document.getElementById('stat1stDueSoon').textContent = c1DueSoon;
  document.getElementById('stat2ndOverdue').textContent = c2Overdue;
  document.getElementById('stat2ndDueSoon').textContent = c2DueSoon;

  document.getElementById('badgeTotal1stDue').textContent = `${dueList1st.length} Pending`;
  document.getElementById('badgeTotal2ndDue').textContent = `${dueList2nd.length} Pending`;

  // Render Charts
  renderChart1(c1Overdue, c1DueSoon, c1Completed, c1Upcoming);
  renderChart2(c2Overdue, c2DueSoon, c2Completed, c2Upcoming);

  // Render Due Tables
  renderDueTable('body1stAppraisalDue', dueList1st, 1);
  renderDueTable('body2ndAppraisalDue', dueList2nd, 2);
}

function renderChart1(overdue, dueSoon, completed, upcoming) {
  const canvas = document.getElementById('chartFirstAppraisal');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  if (chart1Instance) chart1Instance.destroy();

  chart1Instance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Overdue', 'Due Soon (30d)', 'Completed', 'Upcoming (>30d)'],
      datasets: [{
        data: [overdue, dueSoon, completed, upcoming],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'],
        borderWidth: 2,
        borderColor: '#1e293b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#f8fafc', font: { family: 'Plus Jakarta Sans', size: 12 } }
        }
      }
    }
  });
}

function renderChart2(overdue, dueSoon, completed, upcoming) {
  const canvas = document.getElementById('chartSecondAppraisal');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  if (chart2Instance) chart2Instance.destroy();

  chart2Instance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Overdue', 'Due Soon (30d)', 'Completed', 'Upcoming (>30d)'],
      datasets: [{
        data: [overdue, dueSoon, completed, upcoming],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#8b5cf6'],
        borderWidth: 2,
        borderColor: '#1e293b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#f8fafc', font: { family: 'Plus Jakarta Sans', size: 12 } }
        }
      }
    }
  });
}

function renderDueTable(containerId, list, type) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          <i class="fa-solid fa-circle-check" style="color: var(--accent-green);"></i> All ${type === 1 ? '1st' : '2nd'} Appraisals are up to date!
        </td>
      </tr>
    `;
    return;
  }

  list.forEach(item => {
    const r = item.record;
    const tr = document.createElement('tr');

    const dateVal = type === 1 ? r.firstAppraisalDate : r.secondAppraisalDate;
    const marksVal = type === 1 ? r.firstAppraisalMarks : r.secondAppraisalMarks;

    const badgeClass = item.status === 'Overdue' ? 'badge-overdue' : 'badge-duesoon';

    tr.innerHTML = `
      <td class="cell-epf">${escapeHtml(r.epfNumber)}</td>
      <td><strong>${escapeHtml(r.nameWithInitials)}</strong></td>
      <td>${escapeHtml(dateVal || '-')}</td>
      <td><span class="badge ${badgeClass}">${escapeHtml(item.status)}</span></td>
      <td>${escapeHtml(marksVal || '-')}</td>
      <td style="text-align: center; white-space: nowrap;">
        <button class="btn btn-primary btn-mark-appraisal" data-id="${r.id}" style="padding: 0.25rem 0.6rem; font-size: 0.725rem;">
          <i class="fa-solid fa-pen"></i> Mark
        </button>
        <button class="btn btn-warning btn-resign-appraisal" data-id="${r.id}" style="padding: 0.25rem 0.6rem; font-size: 0.725rem;" title="Mark as Resigned">
          <i class="fa-solid fa-user-minus"></i> Resign
        </button>
      </td>
    `;

    container.appendChild(tr);
  });
}

// --- Modal Handlers ---
function openModal(isEdit = false, recordObj = null) {
  labourForm.reset();
  
  if (isEdit && recordObj) {
    modalTitle.innerHTML = `<i class="fa-solid fa-user-pen"></i> Edit Labour Record (EPF: ${escapeHtml(recordObj.epfNumber)})`;
    editRecordId.value = recordObj.id;

    document.getElementById('epfNumber').value = recordObj.epfNumber || '';
    document.getElementById('gender').value = recordObj.gender || 'Male';
    document.getElementById('nameWithInitials').value = recordObj.nameWithInitials || '';
    document.getElementById('firstName').value = recordObj.firstName || '';
    document.getElementById('lastName').value = recordObj.lastName || '';
    document.getElementById('birthDate').value = recordObj.birthDate || '';
    const joined = recordObj.joinedDate || '';
    document.getElementById('joinedDate').value = joined;
    document.getElementById('firstAppraisalDate').value = recordObj.firstAppraisalDate || (joined ? addMonthsToDateStr(joined, 1) : '');
    document.getElementById('firstAppraisalMarks').value = recordObj.firstAppraisalMarks || '-';
    document.getElementById('secondAppraisalDate').value = recordObj.secondAppraisalDate || (joined ? addMonthsToDateStr(joined, 3) : '');
    document.getElementById('secondAppraisalMarks').value = recordObj.secondAppraisalMarks || '-';
    document.getElementById('resignDate').value = recordObj.resignDate || '';
    document.getElementById('confirmationLetter').value = recordObj.confirmationLetter || 'Pending';
    document.getElementById('designation').value = recordObj.designation || '';
    document.getElementById('jobRole').value = recordObj.jobRole || '';
    const sectionSelect = document.getElementById('section');
    if (recordObj.section && !Array.from(sectionSelect.options).some(opt => opt.value === recordObj.section)) {
      const opt = document.createElement('option');
      opt.value = recordObj.section;
      opt.textContent = recordObj.section;
      sectionSelect.appendChild(opt);
    }
    sectionSelect.value = recordObj.section || '';
  } else {
    modalTitle.innerHTML = `<i class="fa-solid fa-user-plus"></i> Labour Registration Form`;
    editRecordId.value = '';
  }

  updateLiveCalculations(false);
  labourModal.classList.add('active');
}

function closeModal() {
  labourModal.classList.remove('active');
}

function handleSaveRecord() {
  const epfNumber = document.getElementById('epfNumber').value.trim();
  const gender = document.getElementById('gender').value;
  const nameWithInitials = document.getElementById('nameWithInitials').value.trim();
  const joinedDate = document.getElementById('joinedDate').value;

  if (!epfNumber || !nameWithInitials || !joinedDate) {
    showToast('Please fill in required fields (EPF Number, Name with Initials, Joined Date)', 'error');
    return;
  }

  const recordId = editRecordId.value;
  
  // Duplicate EPF check
  const duplicate = labourRecords.find(r => r.epfNumber === epfNumber && r.id !== recordId);
  if (duplicate) {
    showToast(`EPF Number "${epfNumber}" is already registered!`, 'error');
    return;
  }

  let firstAppraisalDate = document.getElementById('firstAppraisalDate').value;
  let secondAppraisalDate = document.getElementById('secondAppraisalDate').value;

  if (joinedDate) {
    if (!firstAppraisalDate) firstAppraisalDate = addMonthsToDateStr(joinedDate, 1);
    if (!secondAppraisalDate) secondAppraisalDate = addMonthsToDateStr(joinedDate, 3);
  }

  const recordData = {
    id: recordId || 'REC_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    epfNumber,
    gender,
    nameWithInitials,
    firstName: document.getElementById('firstName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    birthDate: document.getElementById('birthDate').value,
    joinedDate,
    firstAppraisalDate,
    firstAppraisalMarks: document.getElementById('firstAppraisalMarks').value.trim() || '-',
    secondAppraisalDate,
    secondAppraisalMarks: document.getElementById('secondAppraisalMarks').value.trim() || '-',
    resignDate: document.getElementById('resignDate').value,
    confirmationLetter: document.getElementById('confirmationLetter').value,
    designation: document.getElementById('designation').value.trim(),
    jobRole: document.getElementById('jobRole').value.trim(),
    section: document.getElementById('section').value.trim(),
    updatedAt: new Date().toISOString()
  };

  if (recordId) {
    // Update existing
    const index = labourRecords.findIndex(r => r.id === recordId);
    if (index !== -1) {
      labourRecords[index] = recordData;
      showToast(`Labour record for EPF ${epfNumber} updated successfully!`, 'success');
    }
  } else {
    // Add new
    labourRecords.unshift(recordData);
    showToast(`New Labour registered successfully with EPF ${epfNumber}!`, 'success');
  }

  saveRecordsToStorage();
  renderTable();
  if (activePage === 'appraisalsPage') {
    renderAppraisalDashboard();
  }
  closeModal();
}

function handleDeleteRecord(id) {
  const record = labourRecords.find(r => r.id === id);
  if (!record) return;

  if (confirm(`Are you sure you want to delete labour record for EPF ${record.epfNumber} (${record.nameWithInitials})?`)) {
    labourRecords = labourRecords.filter(r => r.id !== id);
    saveRecordsToStorage();
    renderTable();
    if (activePage === 'appraisalsPage') {
      renderAppraisalDashboard();
    }
    showToast(`Record EPF ${record.epfNumber} deleted!`, 'success');
  }
}

// --- Excel (.xlsx) Export Handler ---
function exportToExcel() {
  if (labourRecords.length === 0) {
    showToast('No labour records available to export!', 'error');
    return;
  }

  // Sort records by EPF number for clean output
  const recordsCopy = [...labourRecords].sort((a, b) => {
    const numA = parseInt(a.epfNumber, 10);
    const numB = parseInt(b.epfNumber, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return (a.epfNumber || '').localeCompare(b.epfNumber || '');
  });

  const exportData = recordsCopy.map(r => ({
    'EPF Number': r.epfNumber || '',
    'Gender': r.gender || '',
    'Name with Initials': r.nameWithInitials || '',
    'First Name': r.firstName || '',
    'Last Name': r.lastName || '',
    'Birth Date': r.birthDate || '',
    'Joined Date': r.joinedDate || '',
    '1st Appraisal Date ( After One Month )': r.firstAppraisalDate || (r.joinedDate ? addMonthsToDateStr(r.joinedDate, 1) : ''),
    'Service Period': calculateServicePeriod(r.joinedDate, r.resignDate),
    '1st Appraisal Marks': r.firstAppraisalMarks || '-',
    '2nd Appraisal Date ( After 3 Months )': r.secondAppraisalDate || (r.joinedDate ? addMonthsToDateStr(r.joinedDate, 3) : ''),
    '2nd Appraisal Marks': r.secondAppraisalMarks || '-',
    'RESIGN DATE': r.resignDate || '',
    'Confirmation Letter': r.confirmationLetter || 'Pending',
    'Designation': r.designation || '',
    'Job Role': r.jobRole || '',
    'Section': r.section || ''
  }));

  if (typeof XLSX !== 'undefined') {
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-fit column widths
    worksheet['!cols'] = [
      { wch: 12 }, // EPF Number
      { wch: 8 },  // Gender
      { wch: 28 }, // Name with Initials
      { wch: 18 }, // First Name
      { wch: 18 }, // Last Name
      { wch: 14 }, // Birth Date
      { wch: 14 }, // Joined Date
      { wch: 36 }, // 1st Appraisal Date ( After One Month )
      { wch: 28 }, // Service Period
      { wch: 20 }, // 1st Appraisal Marks
      { wch: 36 }, // 2nd Appraisal Date ( After 3 Months )
      { wch: 20 }, // 2nd Appraisal Marks
      { wch: 14 }, // RESIGN DATE
      { wch: 20 }, // Confirmation Letter
      { wch: 22 }, // Designation
      { wch: 22 }, // Job Role
      { wch: 16 }  // Section
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Labour Records');
    
    const todayStr = formatDateToInput(new Date());
    XLSX.writeFile(workbook, `Labour_Registration_Records_${todayStr}.xlsx`);
    showToast('Excel file exported successfully!', 'success');
  } else {
    showToast('Excel library loading, please try again in a moment.', 'error');
  }
}

function escapeCsvCell(str) {
  if (str === null || str === undefined) return '""';
  const text = String(str).replace(/"/g, '""');
  return `"${text}"`;
}

function importFromCsv(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const text = evt.target.result;
    const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
    if (lines.length <= 1) {
      showToast('CSV file appears empty or missing headers!', 'error');
      return;
    }

    let importedCount = 0;
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length >= 7 && cols[0]) {
        const epfNumber = cols[0].trim();
        if (!labourRecords.some(r => r.epfNumber === epfNumber)) {
          const newRecord = {
            id: 'REC_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            epfNumber,
            gender: cols[1] || 'Male',
            nameWithInitials: cols[2] || '',
            firstName: cols[3] || '',
            lastName: cols[4] || '',
            birthDate: cols[5] || '',
            joinedDate: cols[6] || '',
            firstAppraisalDate: cols[7] || addMonthsToDateStr(cols[6], 1),
            firstAppraisalMarks: cols[9] || '-',
            secondAppraisalDate: cols[10] || addMonthsToDateStr(cols[6], 3),
            secondAppraisalMarks: cols[11] || '-',
            resignDate: cols[12] || '',
            confirmationLetter: cols[13] || 'Pending',
            designation: cols[14] || '',
            jobRole: cols[15] || '',
            section: cols[16] || '',
            updatedAt: new Date().toISOString()
          };
          labourRecords.push(newRecord);
          importedCount++;
        }
      }
    }

    saveRecordsToStorage();
    renderTable();
    showToast(`Successfully imported ${importedCount} new labour records!`, 'success');
    fileCsvImport.value = '';
  };

  reader.readAsText(file);
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function switchPage(pageId) {
  activePage = pageId;
  const pages = ['directoryPage', 'appraisalsPage', 'resignedPage', 'analyticsPage', 'usersPage'];
  const tabs = ['tabDirectory', 'tabAppraisals', 'tabResigned', 'tabAnalytics', 'tabUsers'];

  pages.forEach(pId => {
    const el = document.getElementById(pId);
    if (el) el.style.display = pId === pageId ? 'block' : 'none';
  });

  tabs.forEach(tId => {
    const tabEl = document.getElementById(tId);
    if (tabEl) {
      if (tabEl.dataset.page === pageId) {
        tabEl.classList.add('active');
      } else {
        tabEl.classList.remove('active');
      }
    }
  });

  if (pageId === 'appraisalsPage') {
    renderAppraisalDashboard();
  } else if (pageId === 'resignedPage') {
    renderResignedTable();
  } else if (pageId === 'analyticsPage') {
    renderSectionAnalytics();
  } else if (pageId === 'usersPage') {
    renderUsersTable();
    updateUserStats();
  }
}

// --- Event Listeners ---
function initEventListeners() {
  btnNewLabour.addEventListener('click', () => openModal(false));
  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);
  btnSaveLabour.addEventListener('click', handleSaveRecord);

  // Close modal on backdrop click
  labourModal.addEventListener('click', (e) => {
    if (e.target === labourModal) closeModal();
  });

  // Live Calculations on form input
  ['input', 'change', 'keyup', 'blur'].forEach(evtType => {
    inputJoinedDate.addEventListener(evtType, () => updateLiveCalculations(true));
    inputResignDate.addEventListener(evtType, () => updateLiveCalculations(false));
    inputFirstAppraisal.addEventListener(evtType, () => updateLiveCalculations(false));
    inputSecondAppraisal.addEventListener(evtType, () => updateLiveCalculations(false));
  });

  // Resign Modal Handlers
  function openResignModal(recordId) {
    const record = labourRecords.find(r => r.id === recordId);
    if (!record) return;

    document.getElementById('resignLabourId').value = recordId;
    document.getElementById('resignLabourInfo').textContent = `EPF ${record.epfNumber} - ${record.nameWithInitials}`;
    document.getElementById('resignLabourJoined').textContent = `Joined Date: ${record.joinedDate || '-'}`;

    const todayStr = formatDateToInput(new Date());
    const resignInput = document.getElementById('inputResignDateModal');
    resignInput.value = record.resignDate || todayStr;

    const computePreview = () => {
      const period = calculateServicePeriod(record.joinedDate, resignInput.value);
      document.getElementById('previewResignServicePeriod').textContent = period;
    };

    computePreview();
    if (resignModal) resignModal.classList.add('active');
  }

  function closeResignModal() {
    if (resignModal) resignModal.classList.remove('active');
  }

  function handleConfirmResign() {
    const recordId = document.getElementById('resignLabourId').value;
    const resignDate = document.getElementById('inputResignDateModal').value;

    if (!resignDate) {
      showToast('Please select a Resign Date!', 'error');
      return;
    }

    const record = labourRecords.find(r => r.id === recordId);
    if (!record) return;

    record.resignDate = resignDate;
    record.updatedAt = new Date().toISOString();

    saveRecordsToStorage();
    renderTable();
    renderResignedTable();
    updateAppraisalDueBadge();
    if (activePage === 'appraisalsPage') renderAppraisalDashboard();

    closeResignModal();
    showToast(`Labourer EPF ${record.epfNumber} (${record.nameWithInitials}) marked as Resigned!`, 'success');
  }

  function handleReactivateLabour(recordId) {
    const record = labourRecords.find(r => r.id === recordId);
    if (!record) return;

    if (confirm(`Re-activate EPF ${record.epfNumber} (${record.nameWithInitials}) and remove resignation status?`)) {
      record.resignDate = '';
      record.updatedAt = new Date().toISOString();

      saveRecordsToStorage();
      renderTable();
      renderResignedTable();
      updateAppraisalDueBadge();
      if (activePage === 'appraisalsPage') renderAppraisalDashboard();

      showToast(`Labourer EPF ${record.epfNumber} re-activated successfully!`, 'success');
    }
  }

  if (btnCloseResignModal) btnCloseResignModal.addEventListener('click', closeResignModal);
  if (btnCancelResignModal) btnCancelResignModal.addEventListener('click', closeResignModal);
  if (btnConfirmResignModal) btnConfirmResignModal.addEventListener('click', handleConfirmResign);

  if (resignModal) {
    resignModal.addEventListener('click', (e) => {
      if (e.target === resignModal) closeResignModal();
    });
  }

  if (inputResignDateModal) {
    ['input', 'change', 'keyup'].forEach(evtType => {
      inputResignDateModal.addEventListener(evtType, () => {
        const recordId = document.getElementById('resignLabourId').value;
        const record = labourRecords.find(r => r.id === recordId);
        if (record && previewResignServicePeriod) {
          previewResignServicePeriod.textContent = calculateServicePeriod(record.joinedDate, inputResignDateModal.value);
        }
      });
    });
  }

  // Table Delegation (Edit / Delete / Resign)
  tableBody.addEventListener('click', (e) => {
    const btnEdit = e.target.closest('.btn-edit');
    const btnDelete = e.target.closest('.btn-delete');
    const btnResign = e.target.closest('.btn-resign');

    if (btnEdit) {
      const id = btnEdit.dataset.id;
      const record = labourRecords.find(r => r.id === id);
      if (record) openModal(true, record);
    } else if (btnDelete) {
      const id = btnDelete.dataset.id;
      handleDeleteRecord(id);
    } else if (btnResign) {
      const id = btnResign.dataset.id;
      openResignModal(id);
    }
  });

  // Resigned Table Delegation
  const resBody = document.getElementById('resignedTableBody');
  if (resBody) {
    resBody.addEventListener('click', (e) => {
      const btnReactivate = e.target.closest('.btn-reactivate-labour');
      const btnEdit = e.target.closest('.btn-edit');
      const btnDelete = e.target.closest('.btn-delete');

      if (btnReactivate) {
        handleReactivateLabour(btnReactivate.dataset.id);
      } else if (btnEdit) {
        const record = labourRecords.find(r => r.id === btnEdit.dataset.id);
        if (record) openModal(true, record);
      } else if (btnDelete) {
        handleDeleteRecord(btnDelete.dataset.id);
      }
    });
  }

  // Table Header Sorting
  document.querySelectorAll('.labour-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (sortColumn === col) {
        sortAscending = !sortAscending;
      } else {
        sortColumn = col;
        sortAscending = true;
      }
      renderTable();
    });
  });

  // Filters & Search
  searchInput.addEventListener('input', renderTable);
  filterSection.addEventListener('change', renderTable);
  filterGender.addEventListener('change', renderTable);
  filterStatus.addEventListener('change', renderTable);

  btnClearFilters.addEventListener('click', () => {
    searchInput.value = '';
    filterSection.value = '';
    filterGender.value = '';
    filterStatus.value = '';
    renderTable();
  });

  // Resigned Page Filters & Search
  const searchResigned = document.getElementById('searchResignedInput');
  const filterResSection = document.getElementById('filterResignedSection');
  const filterResGender = document.getElementById('filterResignedGender');
  const btnClearResFilters = document.getElementById('btnClearResignedFilters');

  if (searchResigned) searchResigned.addEventListener('input', renderResignedTable);
  if (filterResSection) filterResSection.addEventListener('change', renderResignedTable);
  if (filterResGender) filterResGender.addEventListener('change', renderResignedTable);

  if (btnClearResFilters) {
    btnClearResFilters.addEventListener('click', () => {
      if (searchResigned) searchResigned.value = '';
      if (filterResSection) filterResSection.value = '';
      if (filterResGender) filterResGender.value = '';
      renderResignedTable();
    });
  }

  // Authentication & Login Event Handlers
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) btnLogout.addEventListener('click', handleLogout);

  const btnTogglePw = document.getElementById('btnTogglePassword');
  if (btnTogglePw) {
    btnTogglePw.addEventListener('click', () => {
      const pwInput = document.getElementById('loginPassword');
      const iconPw = document.getElementById('iconTogglePw');
      if (pwInput && iconPw) {
        if (pwInput.type === 'password') {
          pwInput.type = 'text';
          iconPw.className = 'fa-solid fa-eye-slash';
        } else {
          pwInput.type = 'password';
          iconPw.className = 'fa-solid fa-eye';
        }
      }
    });
  }

  // User Management Event Handlers
  const btnNewUser = document.getElementById('btnNewUser');
  if (btnNewUser) btnNewUser.addEventListener('click', () => openUserModal(false));

  const btnCloseUserModal = document.getElementById('btnCloseUserModal');
  const btnCancelUserModal = document.getElementById('btnCancelUserModal');
  const btnSaveUser = document.getElementById('btnSaveUser');

  if (btnCloseUserModal) btnCloseUserModal.addEventListener('click', closeUserModal);
  if (btnCancelUserModal) btnCancelUserModal.addEventListener('click', closeUserModal);
  if (btnSaveUser) btnSaveUser.addEventListener('click', saveUserRecord);

  const userModal = document.getElementById('userModal');
  if (userModal) {
    userModal.addEventListener('click', (e) => {
      if (e.target === userModal) closeUserModal();
    });
  }

  const searchUser = document.getElementById('searchUserInput');
  const filterRole = document.getElementById('filterUserRole');
  if (searchUser) searchUser.addEventListener('input', renderUsersTable);
  if (filterRole) filterRole.addEventListener('change', renderUsersTable);

  const usersTableBody = document.getElementById('usersTableBody');
  if (usersTableBody) {
    usersTableBody.addEventListener('click', (e) => {
      const btnEdit = e.target.closest('.btn-edit-user');
      const btnDelete = e.target.closest('.btn-delete-user');
      if (btnEdit) {
        const uId = btnEdit.dataset.id;
        const user = systemUsers.find(u => u.id === uId);
        if (user) openUserModal(true, user);
      } else if (btnDelete) {
        const uId = btnDelete.dataset.id;
        deleteUserRecord(uId);
      }
    });
  }

  // Tab Switchers
  tabDirectory.addEventListener('click', () => switchPage('directoryPage'));
  tabAppraisals.addEventListener('click', () => switchPage('appraisalsPage'));
  const tabResignedEl = document.getElementById('tabResigned');
  if (tabResignedEl) tabResignedEl.addEventListener('click', () => switchPage('resignedPage'));
  const tabAnalyticsEl = document.getElementById('tabAnalytics');
  if (tabAnalyticsEl) tabAnalyticsEl.addEventListener('click', () => switchPage('analyticsPage'));
  const tabUsersEl = document.getElementById('tabUsers');
  if (tabUsersEl) tabUsersEl.addEventListener('click', () => switchPage('usersPage'));

  // Due Table Mark / Resign Appraisal click handler
  ['body1stAppraisalDue', 'body2ndAppraisalDue'].forEach(id => {
    const tbody = document.getElementById(id);
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const btnMark = e.target.closest('.btn-mark-appraisal');
        const btnResign = e.target.closest('.btn-resign-appraisal');
        if (btnMark) {
          const recordId = btnMark.dataset.id;
          const record = labourRecords.find(r => r.id === recordId);
          if (record) openModal(true, record);
        } else if (btnResign) {
          const recordId = btnResign.dataset.id;
          openResignModal(recordId);
        }
      });
    }
  });

  // Excel Export Handler
  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', exportToExcel);
  }
}

// Helper Toast Notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
