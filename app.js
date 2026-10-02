/**
 * Labour Registration & Service Period Calculation System
 * App JavaScript Engine
 */

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
const inputMedicalDate = document.getElementById('medicalDate');
const inputMedicalStatus = document.getElementById('medicalStatus');
const inputSecondAppraisal = document.getElementById('secondAppraisalDate');
const previewAppraisal1 = document.getElementById('previewAppraisal1');
const previewMedicalDate = document.getElementById('previewMedicalDate');
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
const btnImportExcel = document.getElementById('btnImportExcel');

// Excel Import Modal Elements
const excelImportModal = document.getElementById('excelImportModal');
const btnCloseImportModal = document.getElementById('btnCloseImportModal');
const btnCancelImportModal = document.getElementById('btnCancelImportModal');
const btnConfirmImport = document.getElementById('btnConfirmImport');
const btnDownloadTemplate = document.getElementById('btnDownloadTemplate');
const importDropZone = document.getElementById('importDropZone');
const excelFileInput = document.getElementById('excelFileInput');
const selectedFileName = document.getElementById('selectedFileName');
const fileNameText = document.getElementById('fileNameText');
const btnClearFile = document.getElementById('btnClearFile');
const importStatsContainer = document.getElementById('importStatsContainer');
const statImportTotal = document.getElementById('statImportTotal');
const statImportNew = document.getElementById('statImportNew');
const statImportExisting = document.getElementById('statImportExisting');
const statImportInvalid = document.getElementById('statImportInvalid');
const importPreviewContainer = document.getElementById('importPreviewContainer');
const previewCountText = document.getElementById('previewCountText');
const btnImportCount = document.getElementById('btnImportCount');
const importPreviewTableBody = document.getElementById('importPreviewTableBody');

let parsedImportRecords = [];

// Tab & Dashboard Elements
let chart1Instance = null;
let chart2Instance = null;
let chartMedicalInstance = null;
let chartSectionActiveInstance = null;
let chartSectionResignedInstance = null;
let activePage = 'directoryPage';

const tabDirectory = document.getElementById('tabDirectory');
const tabAppraisals = document.getElementById('tabAppraisals');
const tabMedical = document.getElementById('tabMedical');
const tabResigned = document.getElementById('tabResigned');
const tabDueBadge = document.getElementById('tabDueBadge');
const tabMedicalBadge = document.getElementById('tabMedicalBadge');
const tabResignedBadge = document.getElementById('tabResignedBadge');

const directoryPage = document.getElementById('directoryPage');
const appraisalsPage = document.getElementById('appraisalsPage');
const medicalPage = document.getElementById('medicalPage');
const resignedPage = document.getElementById('resignedPage');

// Resign Modal Controls
const resignModal = document.getElementById('resignModal');
const btnCloseResignModal = document.getElementById('btnCloseResignModal');
const btnCancelResignModal = document.getElementById('btnCancelResignModal');
const btnConfirmResignModal = document.getElementById('btnConfirmResignModal');
const inputResignDateModal = document.getElementById('inputResignDateModal');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadRecordsFromStorage();
  loadUsersFromStorage();
  initEventListeners();
  checkCurrentSession();
  renderTable();
  updateSectionFilterOptions();
  updateAppraisalDueBadge();
  updateMedicalDueBadge();
});

const STORAGE_KEY = 'HR_LABOUR_RECORDS_V1';

function loadRecordsFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      labourRecords = JSON.parse(data);
      if (!Array.isArray(labourRecords)) labourRecords = [];
      // Guarantee each record has a unique ID for deletion & editing
      labourRecords.forEach((r, idx) => {
        if (!r.id) {
          r.id = 'REC_' + (r.epfNumber || Date.now()) + '_' + idx;
        }
        if (!r.medicalDate && r.joinedDate) {
          r.medicalDate = addMonthsToDateStr(r.joinedDate, 2);
        }
        if (!r.medicalStatus) {
          r.medicalStatus = 'Pending';
        }
      });
    } catch (e) {
      console.error('Failed to parse stored records', e);
      labourRecords = [];
    }
  } else {
    labourRecords = [];
  }
}

function saveRecordsToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(labourRecords));
  updateSectionFilterOptions();
  updateStats();
}

// --- Authentication & User Management Storage ---
function loadUsersFromStorage() {
  const data = localStorage.getItem(USERS_STORAGE_KEY);
  if (data) {
    try {
      systemUsers = JSON.parse(data);
      // Ensure default admin account exists
      if (!systemUsers.find(u => u.username === 'admin')) {
        systemUsers.unshift(DEFAULT_ADMIN);
      }
    } catch (e) {
      console.error('Failed to parse stored users', e);
      systemUsers = [DEFAULT_ADMIN];
    }
  } else {
    systemUsers = [DEFAULT_ADMIN];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(systemUsers));
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
  const btnImportExcelEl = document.getElementById('btnImportExcel');
  const tabUsersEl = document.getElementById('tabUsers');
  const btnClearAllLabourEl = document.getElementById('btnClearAllLabour');

  if (role === 'Viewer') {
    if (btnNewLabourEl) btnNewLabourEl.style.display = 'none';
    if (btnImportExcelEl) btnImportExcelEl.style.display = 'none';
    if (tabUsersEl) tabUsersEl.style.display = 'none';
    if (btnClearAllLabourEl) btnClearAllLabourEl.style.display = 'none';
  } else if (role === 'HR Staff') {
    if (btnNewLabourEl) btnNewLabourEl.style.display = 'inline-flex';
    if (btnImportExcelEl) btnImportExcelEl.style.display = 'inline-flex';
    if (tabUsersEl) tabUsersEl.style.display = 'none'; // Only Admin can manage system users
    if (btnClearAllLabourEl) btnClearAllLabourEl.style.display = 'inline-flex';
  } else {
    // Admin: Full access
    if (btnNewLabourEl) btnNewLabourEl.style.display = 'inline-flex';
    if (btnImportExcelEl) btnImportExcelEl.style.display = 'inline-flex';
    if (tabUsersEl) tabUsersEl.style.display = 'inline-flex';
    if (btnClearAllLabourEl) btnClearAllLabourEl.style.display = 'inline-flex';
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
        <td style="text-align: center; white-space: nowrap;">
          <button type="button" class="btn-icon btn-edit-user" data-id="${u.id}" title="Edit User Account">
            <i class="fa-solid fa-pen-to-square" style="color: var(--accent-blue); pointer-events: none;"></i>
          </button>
          ${u.username === 'admin' || u.id === 'usr_admin' ? `
          <button type="button" class="btn-icon" disabled style="opacity: 0.35; cursor: not-allowed;" title="Protected System Admin Account">
            <i class="fa-solid fa-lock" style="pointer-events: none;"></i>
          </button>
          ` : `
          <button type="button" class="btn-icon btn-delete-user" data-id="${u.id}" title="Delete User Account" style="color: var(--accent-red);">
            <i class="fa-solid fa-trash-can" style="pointer-events: none;"></i>
          </button>
          `}
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

// --- Strong Password Evaluation Engine ---
function evaluatePasswordStrength(password) {
  const p = password || '';
  const hasLength = p.length >= 8;
  const hasUpper = /[A-Z]/.test(p);
  const hasLower = /[a-z]/.test(p);
  const hasNumber = /[0-9]/.test(p);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p);

  const validCount = [hasLength, hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;

  let score = 'weak';
  if (validCount >= 5) score = 'strong';
  else if (validCount >= 3) score = 'medium';

  return {
    hasLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSymbol,
    validCount,
    isStrong: validCount >= 4 && hasLength,
    score
  };
}

function updatePasswordStrengthUI(password) {
  const fill = document.getElementById('pwMeterFill');
  const labelStatus = document.getElementById('pwStrengthStatus');
  const ruleLength = document.getElementById('ruleLength');
  const ruleUpper = document.getElementById('ruleUpper');
  const ruleLower = document.getElementById('ruleLower');
  const ruleNumber = document.getElementById('ruleNumber');
  const ruleSymbol = document.getElementById('ruleSymbol');

  if (!fill || !labelStatus) return;

  const result = evaluatePasswordStrength(password);

  fill.className = 'pw-meter-fill ' + (password ? result.score : '');
  if (!password) {
    labelStatus.textContent = 'Enter password';
    labelStatus.style.color = 'var(--text-muted)';
  } else if (result.score === 'strong') {
    labelStatus.textContent = 'Strong ✓';
    labelStatus.style.color = 'var(--accent-green)';
  } else if (result.score === 'medium') {
    labelStatus.textContent = 'Medium';
    labelStatus.style.color = 'var(--accent-orange)';
  } else {
    labelStatus.textContent = 'Too Weak';
    labelStatus.style.color = 'var(--accent-red)';
  }

  const updateRuleItem = (el, isValid) => {
    if (!el) return;
    if (isValid) {
      el.className = 'pw-rule-item valid';
      el.querySelector('i').className = 'fa-solid fa-circle-check';
    } else {
      el.className = 'pw-rule-item';
      el.querySelector('i').className = 'fa-solid fa-circle-xmark';
    }
  };

  updateRuleItem(ruleLength, result.hasLength);
  updateRuleItem(ruleUpper, result.hasUpper);
  updateRuleItem(ruleLower, result.hasLower);
  updateRuleItem(ruleNumber, result.hasNumber);
  updateRuleItem(ruleSymbol, result.hasSymbol);
}

function openUserModal(isEdit = false, userRecord = null) {
  const modal = document.getElementById('userModal');
  const form = document.getElementById('userForm');
  const title = document.getElementById('userModalTitle');
  const editId = document.getElementById('editUserId');
  const btnDeleteModal = document.getElementById('btnDeleteUserModal');

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
    updatePasswordStrengthUI(userRecord.password);

    if (btnDeleteModal) {
      if (userRecord.username === 'admin' || userRecord.id === 'usr_admin') {
        btnDeleteModal.style.display = 'none';
      } else {
        btnDeleteModal.style.display = 'inline-flex';
        btnDeleteModal.onclick = () => deleteUserRecord(userRecord.id);
      }
    }
  } else {
    title.innerHTML = '<i class="fa-solid fa-user-plus"></i> Register New System User';
    editId.value = '';
    updatePasswordStrengthUI('');
    if (btnDeleteModal) btnDeleteModal.style.display = 'none';
  }
  modal.classList.add('active');
}

function closeUserModal() {
  const modal = document.getElementById('userModal');
  if (modal) modal.classList.remove('active');
}

function saveUserRecord(e) {
  if (e) e.preventDefault();
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

  // Validate Strong Password Method
  const evalResult = evaluatePasswordStrength(password);
  if (!evalResult.isStrong) {
    showToast('Password is too weak! Must be 8+ characters with uppercase, lowercase, number, and symbol.', 'error');
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

  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(systemUsers));
  closeUserModal();
  renderUsersTable();
  updateUserStats();
}

function deleteUserRecord(userId) {
  const user = systemUsers.find(u => u.id === userId);
  if (!user) return;

  if (user.username === 'admin' || user.id === 'usr_admin') {
    showToast('Default system admin account cannot be deleted', 'error');
    return;
  }

  if (currentUser && currentUser.id === userId) {
    showToast('You cannot delete your active logged-in user account', 'error');
    return;
  }

  openConfirmModal({
    title: 'Delete User Account',
    titleColor: '#ef4444',
    iconClass: 'fa-solid fa-user-xmark',
    iconColor: '#ef4444',
    message: `Are you sure you want to permanently delete user account "${user.username}" (${user.fullName || 'No Name'})? This user will no longer be able to log in.`,
    confirmText: 'Delete User Account',
    confirmBtnStyle: 'background: #dc2626; border-color: #ef4444;',
    onConfirm: () => {
      systemUsers = systemUsers.filter(u => u.id !== userId);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(systemUsers));
      closeConfirmModal();
      closeUserModal();
      renderUsersTable();
      updateUserStats();
      showToast(`User account "${user.username}" deleted successfully`, 'info');
    }
  });
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
    const autoMedical = addMonthsToDateStr(joinedVal, 2);
    const auto2nd = addMonthsToDateStr(joinedVal, 3);

    if (forceRecalculateAppraisals || !inputFirstAppraisal.value) {
      inputFirstAppraisal.value = auto1st;
    }
    if (inputMedicalDate && (forceRecalculateAppraisals || !inputMedicalDate.value)) {
      inputMedicalDate.value = autoMedical;
    }
    if (forceRecalculateAppraisals || !inputSecondAppraisal.value) {
      inputSecondAppraisal.value = auto2nd;
    }

    previewAppraisal1.textContent = inputFirstAppraisal.value || auto1st || '-';
    if (previewMedicalDate) {
      previewMedicalDate.textContent = (inputMedicalDate && inputMedicalDate.value) || autoMedical || '-';
    }
    previewAppraisal2.textContent = inputSecondAppraisal.value || auto2nd || '-';

    // Calculate Service Period
    const serviceStr = calculateServicePeriod(joinedVal, resignVal);
    previewServicePeriod.textContent = serviceStr;
  } else {
    if (forceRecalculateAppraisals) {
      inputFirstAppraisal.value = '';
      if (inputMedicalDate) inputMedicalDate.value = '';
      inputSecondAppraisal.value = '';
    }
    previewAppraisal1.textContent = inputFirstAppraisal.value || '-';
    if (previewMedicalDate) {
      previewMedicalDate.textContent = (inputMedicalDate && inputMedicalDate.value) || '-';
    }
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
      const servicePeriodStr = record.servicePeriod || calculateServicePeriod(record.joinedDate, record.resignDate);
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
        <td>${escapeHtml(record.medicalDate || (record.joinedDate ? addMonthsToDateStr(record.joinedDate, 2) : '-'))}</td>
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
          <button type="button" class="btn-icon btn-edit" data-id="${escapeHtml(record.id || record.epfNumber)}" data-epf="${escapeHtml(record.epfNumber)}" title="Edit Record">
            <i class="fa-solid fa-pen-to-square" style="color: var(--accent-blue); pointer-events: none;"></i>
          </button>
          <button type="button" class="btn-icon btn-resign" data-id="${escapeHtml(record.id || record.epfNumber)}" data-epf="${escapeHtml(record.epfNumber)}" title="Mark as Resigned">
            <i class="fa-solid fa-user-minus" style="color: var(--accent-orange); pointer-events: none;"></i>
          </button>
          <button type="button" class="btn-icon btn-delete" data-id="${escapeHtml(record.id || record.epfNumber)}" data-epf="${escapeHtml(record.epfNumber)}" title="Delete Record">
            <i class="fa-solid fa-trash-can" style="color: var(--accent-red); pointer-events: none;"></i>
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

  [filterSection, document.getElementById('filterResignedSection'), document.getElementById('filterMedicalSection')].forEach(selectEl => {
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
  updateMedicalDueBadge();
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

// --- Medical Due & Status Tracking ---
function getMedicalDueStatus(dateStr, medicalStatus) {
  const statusClean = String(medicalStatus || '').trim().toLowerCase();
  if (statusClean === 'fit' || statusClean === 'completed' || statusClean === 'done' || statusClean === 'unfit') {
    return 'Completed';
  }
  if (!dateStr) return 'No Date';

  const todayStr = formatDateToInput(new Date());
  if (dateStr < todayStr) return 'Overdue';

  const today = new Date();
  const targetDate = new Date(dateStr);
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

  if (diffDays <= 30) return 'Due Soon';
  return 'Upcoming';
}

function updateMedicalDueBadge() {
  const activeLabourers = labourRecords.filter(r => !r.resignDate);
  let totalPendingDue = 0;

  activeLabourers.forEach(r => {
    const medDate = r.medicalDate || (r.joinedDate ? addMonthsToDateStr(r.joinedDate, 2) : '');
    const status = getMedicalDueStatus(medDate, r.medicalStatus);
    if (status === 'Overdue' || status === 'Due Soon') totalPendingDue++;
  });

  const tabBadge = document.getElementById('tabMedicalBadge');
  if (tabBadge) {
    tabBadge.textContent = totalPendingDue;
    tabBadge.style.display = totalPendingDue > 0 ? 'inline-block' : 'none';
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
    const finalService = record.servicePeriod || calculateServicePeriod(record.joinedDate, record.resignDate);

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
        <button type="button" class="btn btn-sm btn-reactivate btn-reactivate-labour" data-id="${escapeHtml(record.id || record.epfNumber)}" data-epf="${escapeHtml(record.epfNumber)}" title="Re-activate Labourer">
          <i class="fa-solid fa-rotate-left" style="pointer-events: none;"></i> Re-activate
        </button>
        <button type="button" class="btn-icon btn-edit" data-id="${escapeHtml(record.id || record.epfNumber)}" data-epf="${escapeHtml(record.epfNumber)}" title="Edit Record">
          <i class="fa-solid fa-pen-to-square" style="color: var(--accent-blue); pointer-events: none;"></i>
        </button>
        <button type="button" class="btn-icon btn-delete" data-id="${escapeHtml(record.id || record.epfNumber)}" data-epf="${escapeHtml(record.epfNumber)}" title="Delete Record">
          <i class="fa-solid fa-trash-can" style="color: var(--accent-red); pointer-events: none;"></i>
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

// ==========================================================================
// --- MEDICAL DUE DASHBOARD & EXAMINATION ENGINE ---
// ==========================================================================

function renderMedicalDashboard() {
  const activeLabourers = labourRecords.filter(r => !r.resignDate);

  let overdueCount = 0;
  let dueSoonCount = 0;
  let completedCount = 0;
  let upcomingCount = 0;

  activeLabourers.forEach(r => {
    const medDate = r.medicalDate || (r.joinedDate ? addMonthsToDateStr(r.joinedDate, 2) : '');
    const st = getMedicalDueStatus(medDate, r.medicalStatus);
    if (st === 'Overdue') overdueCount++;
    else if (st === 'Due Soon') dueSoonCount++;
    else if (st === 'Completed') completedCount++;
    else if (st === 'Upcoming') upcomingCount++;
  });

  // KPI Stats Cards
  const elOverdue = document.getElementById('statMedicalOverdue');
  const elDueSoon = document.getElementById('statMedicalDueSoon');
  const elCompleted = document.getElementById('statMedicalCompleted');
  const elUpcoming = document.getElementById('statMedicalUpcoming');
  const badgeDue = document.getElementById('badgeTotalMedicalDue');

  if (elOverdue) elOverdue.textContent = overdueCount;
  if (elDueSoon) elDueSoon.textContent = dueSoonCount;
  if (elCompleted) elCompleted.textContent = completedCount;
  if (elUpcoming) elUpcoming.textContent = upcomingCount;
  if (badgeDue) badgeDue.textContent = `${overdueCount + dueSoonCount} Action Required`;

  // Render Medical Chart
  renderMedicalChart(overdueCount, dueSoonCount, completedCount, upcomingCount);

  // Filter Table Records
  const searchQ = (document.getElementById('searchMedicalInput')?.value || '').toLowerCase().trim();
  const filterDue = document.getElementById('filterMedicalDueStatus')?.value || '';
  const filterSec = document.getElementById('filterMedicalSection')?.value || '';

  const filteredLabourers = activeLabourers.filter(r => {
    const medDate = r.medicalDate || (r.joinedDate ? addMonthsToDateStr(r.joinedDate, 2) : '');
    const st = getMedicalDueStatus(medDate, r.medicalStatus);

    // Search query
    const matchQuery = !searchQ || [
      r.epfNumber,
      r.nameWithInitials,
      r.firstName,
      r.lastName,
      r.section,
      r.designation,
      r.jobRole,
      r.medicalStatus
    ].some(val => (val || '').toLowerCase().includes(searchQ));

    // Section filter
    const matchSec = !filterSec || r.section === filterSec;

    // Due status filter
    let matchDue = true;
    if (filterDue === 'pendingAction') {
      matchDue = (st === 'Overdue' || st === 'Due Soon');
    } else if (filterDue === 'Overdue') {
      matchDue = (st === 'Overdue');
    } else if (filterDue === 'Due Soon') {
      matchDue = (st === 'Due Soon');
    } else if (filterDue === 'Completed') {
      matchDue = (st === 'Completed');
    } else if (filterDue === 'Upcoming') {
      matchDue = (st === 'Upcoming');
    }

    return matchQuery && matchSec && matchDue;
  });

  // Sort filtered list: Overdue first, then Due Soon, then Upcoming, then Completed
  filteredLabourers.sort((a, b) => {
    const dateA = a.medicalDate || (a.joinedDate ? addMonthsToDateStr(a.joinedDate, 2) : '');
    const dateB = b.medicalDate || (b.joinedDate ? addMonthsToDateStr(b.joinedDate, 2) : '');
    const stA = getMedicalDueStatus(dateA, a.medicalStatus);
    const stB = getMedicalDueStatus(dateB, b.medicalStatus);

    const priority = { 'Overdue': 1, 'Due Soon': 2, 'Upcoming': 3, 'Completed': 4, 'No Date': 5 };
    if ((priority[stA] || 99) !== (priority[stB] || 99)) {
      return (priority[stA] || 99) - (priority[stB] || 99);
    }
    return (dateA || '').localeCompare(dateB || '');
  });

  const countBadge = document.getElementById('medicalListCountBadge');
  if (countBadge) {
    countBadge.textContent = `Showing ${filteredLabourers.length} of ${activeLabourers.length}`;
  }

  // Render Table
  renderMedicalDueTable(filteredLabourers);
}

function renderMedicalChart(overdue, dueSoon, completed, upcoming) {
  const canvas = document.getElementById('chartMedicalStatus');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  if (chartMedicalInstance) chartMedicalInstance.destroy();

  chartMedicalInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Overdue', 'Due Soon (30d)', 'Completed / Fit', 'Upcoming (>30d)'],
      datasets: [{
        data: [overdue, dueSoon, completed, upcoming],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#06b6d4'],
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

function renderMedicalDueTable(list) {
  const tbody = document.getElementById('bodyMedicalDue');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          <i class="fa-solid fa-circle-check" style="color: var(--accent-green); font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
          No medical records match the selected filter criteria!
        </td>
      </tr>
    `;
    return;
  }

  const today = new Date();

  list.forEach(r => {
    const medDate = r.medicalDate || (r.joinedDate ? addMonthsToDateStr(r.joinedDate, 2) : '');
    const dueStatus = getMedicalDueStatus(medDate, r.medicalStatus);

    let statusBadge = '';
    if (dueStatus === 'Overdue') {
      const targetDate = new Date(medDate);
      const daysOverdue = Math.max(1, Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 3600 * 24)));
      statusBadge = `<span class="badge badge-overdue"><i class="fa-solid fa-triangle-exclamation"></i> Overdue (${daysOverdue}d)</span>`;
    } else if (dueStatus === 'Due Soon') {
      const targetDate = new Date(medDate);
      const daysLeft = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24)));
      statusBadge = `<span class="badge badge-duesoon"><i class="fa-solid fa-clock"></i> Due in ${daysLeft}d</span>`;
    } else if (dueStatus === 'Completed') {
      const icon = (r.medicalStatus === 'Unfit') ? 'fa-triangle-exclamation' : 'fa-circle-check';
      const badgeCls = (r.medicalStatus === 'Unfit') ? 'badge-unfit' : 'badge-fit';
      statusBadge = `<span class="badge ${badgeCls}"><i class="fa-solid ${icon}"></i> ${escapeHtml(r.medicalStatus || 'Completed')}</span>`;
    } else {
      statusBadge = `<span class="badge badge-upcoming"><i class="fa-solid fa-calendar"></i> Upcoming</span>`;
    }

    let resultBadge = '';
    const res = (r.medicalStatus || 'Pending').toLowerCase();
    if (res === 'fit') {
      resultBadge = '<span class="badge badge-fit"><i class="fa-solid fa-check"></i> Fit</span>';
    } else if (res === 'unfit') {
      resultBadge = '<span class="badge badge-unfit"><i class="fa-solid fa-xmark"></i> Unfit</span>';
    } else if (res === 'completed') {
      resultBadge = '<span class="badge badge-ok"><i class="fa-solid fa-check-double"></i> Cleared</span>';
    } else {
      resultBadge = '<span class="badge badge-pending">Pending</span>';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="cell-epf"><strong>${escapeHtml(r.epfNumber)}</strong></td>
      <td><strong>${escapeHtml(r.nameWithInitials)}</strong></td>
      <td>${escapeHtml(r.section || '-')}</td>
      <td>${escapeHtml(r.joinedDate || '-')}</td>
      <td><span style="font-weight: 700; color: #38bdf8;">${escapeHtml(medDate || '-')}</span></td>
      <td>${statusBadge}</td>
      <td>${resultBadge}</td>
      <td style="text-align: center; white-space: nowrap;">
        <button type="button" class="btn btn-primary btn-mark-medical" data-id="${escapeHtml(r.id || r.epfNumber)}" style="padding: 0.25rem 0.65rem; font-size: 0.725rem; background: linear-gradient(135deg, #0d9488, #0f766e); border-color: #14b8a6;">
          <i class="fa-solid fa-notes-medical" style="pointer-events: none;"></i> Mark Medical
        </button>
        <button type="button" class="btn-icon btn-edit-medical" data-id="${escapeHtml(r.id || r.epfNumber)}" title="Edit Labour Details">
          <i class="fa-solid fa-pen-to-square" style="color: var(--accent-blue); pointer-events: none;"></i>
        </button>
        <button type="button" class="btn btn-warning btn-resign-medical" data-id="${escapeHtml(r.id || r.epfNumber)}" style="padding: 0.25rem 0.6rem; font-size: 0.725rem;" title="Mark as Resigned">
          <i class="fa-solid fa-user-minus" style="pointer-events: none;"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openMedicalModal(recordId) {
  const record = labourRecords.find(r => 
    (r.id && (r.id === recordId || String(r.id) === String(recordId))) ||
    (r.epfNumber && String(r.epfNumber) === String(recordId))
  );
  if (!record) return;

  const medModal = document.getElementById('medicalRecordModal');
  const idInput = document.getElementById('medicalRecordLabourId');
  const infoEl = document.getElementById('medicalModalLabourInfo');
  const joinedEl = document.getElementById('medicalModalJoined');
  const dueEl = document.getElementById('medicalModalDueDate');
  const dateInput = document.getElementById('inputMedicalModalDate');
  const resultSelect = document.getElementById('selectMedicalModalResult');
  const clinicInput = document.getElementById('inputMedicalModalClinic');
  const notesInput = document.getElementById('inputMedicalModalNotes');

  if (idInput) idInput.value = record.id || record.epfNumber;
  if (infoEl) infoEl.textContent = `EPF ${record.epfNumber} - ${record.nameWithInitials} (${record.section || 'General'})`;
  if (joinedEl) joinedEl.innerHTML = `<i class="fa-solid fa-calendar-day" style="color: var(--accent-blue);"></i> Joined: ${escapeHtml(record.joinedDate || '-')}`;

  const computedDue = record.medicalDate || (record.joinedDate ? addMonthsToDateStr(record.joinedDate, 2) : '-');
  if (dueEl) dueEl.innerHTML = `<i class="fa-solid fa-clock" style="color: var(--accent-orange);"></i> 2-Month Due Date: ${escapeHtml(computedDue)}`;

  const todayStr = formatDateToInput(new Date());
  if (dateInput) dateInput.value = record.medicalDate || computedDue || todayStr;
  if (resultSelect) resultSelect.value = record.medicalStatus && record.medicalStatus !== 'Pending' ? record.medicalStatus : 'Fit';
  if (clinicInput) clinicInput.value = record.medicalClinic || '';
  if (notesInput) notesInput.value = record.medicalNotes || '';

  if (medModal) medModal.classList.add('active');
}

function closeMedicalModal() {
  const medModal = document.getElementById('medicalRecordModal');
  if (medModal) medModal.classList.remove('active');
}

function saveMedicalRecordModal() {
  const idInput = document.getElementById('medicalRecordLabourId');
  if (!idInput) return;
  const recordId = idInput.value;

  const record = labourRecords.find(r => 
    (r.id && (r.id === recordId || String(r.id) === String(recordId))) ||
    (r.epfNumber && String(r.epfNumber) === String(recordId))
  );
  if (!record) {
    showToast('Record not found!', 'error');
    return;
  }

  const examDate = document.getElementById('inputMedicalModalDate')?.value;
  const examResult = document.getElementById('selectMedicalModalResult')?.value || 'Fit';
  const clinic = document.getElementById('inputMedicalModalClinic')?.value.trim() || '';
  const notes = document.getElementById('inputMedicalModalNotes')?.value.trim() || '';

  if (!examDate) {
    showToast('Please select a Medical Examination Date', 'error');
    return;
  }

  record.medicalDate = examDate;
  record.medicalStatus = examResult;
  record.medicalClinic = clinic;
  record.medicalNotes = notes;
  record.updatedAt = new Date().toISOString();

  saveRecordsToStorage();
  closeMedicalModal();
  renderTable();
  updateMedicalDueBadge();
  updateStats();
  if (activePage === 'medicalPage') renderMedicalDashboard();

  showToast(`Medical checkup recorded for EPF ${record.epfNumber} (${examResult})!`, 'success');
}

function exportMedicalReport() {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library loading, please try again.', 'error');
    return;
  }

  const activeLabourers = labourRecords.filter(r => !r.resignDate);
  if (activeLabourers.length === 0) {
    showToast('No active labourers to export for medical checkups!', 'error');
    return;
  }

  const reportData = activeLabourers.map(r => {
    const medDate = r.medicalDate || (r.joinedDate ? addMonthsToDateStr(r.joinedDate, 2) : '');
    const dueSt = getMedicalDueStatus(medDate, r.medicalStatus);

    return {
      'EPF Number': r.epfNumber || '',
      'Gender': r.gender || '',
      'Name with Initials': r.nameWithInitials || '',
      'Section': r.section || '',
      'Designation': r.designation || '',
      'Joined Date': r.joinedDate || '',
      'Medical Due Date ( 2 Months )': medDate,
      'Medical Due Status': dueSt,
      'Medical Result': r.medicalStatus || 'Pending',
      'Clinic / Hospital': r.medicalClinic || '',
      'Remarks': r.medicalNotes || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(reportData);
  worksheet['!cols'] = [
    { wch: 12 }, // EPF Number
    { wch: 8 },  // Gender
    { wch: 28 }, // Name with Initials
    { wch: 18 }, // Section
    { wch: 22 }, // Designation
    { wch: 14 }, // Joined Date
    { wch: 28 }, // Medical Due Date ( 2 Months )
    { wch: 18 }, // Medical Due Status
    { wch: 16 }, // Medical Result
    { wch: 24 }, // Clinic / Hospital
    { wch: 30 }  // Remarks
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Medical Due Report');
  const todayStr = formatDateToInput(new Date());
  XLSX.writeFile(workbook, `Medical_Checkup_Due_Report_${todayStr}.xlsx`);
  showToast('Medical checkup report exported to Excel!', 'success');
}

// --- Modal Handlers ---
function openModal(isEdit = false, recordObj = null) {
  labourForm.reset();
  const btnDeleteModal = document.getElementById('btnDeleteLabourModal');
  
  if (isEdit && recordObj) {
    modalTitle.innerHTML = `<i class="fa-solid fa-user-pen"></i> Edit Labour Record (EPF: ${escapeHtml(recordObj.epfNumber)})`;
    editRecordId.value = recordObj.id || recordObj.epfNumber;

    if (btnDeleteModal) {
      if (currentUser && currentUser.role === 'Viewer') {
        btnDeleteModal.style.display = 'none';
      } else {
        btnDeleteModal.style.display = 'inline-flex';
        btnDeleteModal.onclick = () => handleDeleteRecord(recordObj.id, recordObj.epfNumber);
      }
    }

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
    if (document.getElementById('medicalDate')) {
      document.getElementById('medicalDate').value = recordObj.medicalDate || (joined ? addMonthsToDateStr(joined, 2) : '');
    }
    if (document.getElementById('medicalStatus')) {
      document.getElementById('medicalStatus').value = recordObj.medicalStatus || 'Pending';
    }
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
    if (document.getElementById('medicalDate')) document.getElementById('medicalDate').value = '';
    if (document.getElementById('medicalStatus')) document.getElementById('medicalStatus').value = 'Pending';
    if (btnDeleteModal) btnDeleteModal.style.display = 'none';
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
  let medicalDate = document.getElementById('medicalDate')?.value || '';
  const medicalStatus = document.getElementById('medicalStatus')?.value || 'Pending';

  if (joinedDate) {
    if (!firstAppraisalDate) firstAppraisalDate = addMonthsToDateStr(joinedDate, 1);
    if (!medicalDate) medicalDate = addMonthsToDateStr(joinedDate, 2);
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
    medicalDate,
    medicalStatus,
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
      labourRecords[index] = { ...labourRecords[index], ...recordData };
      showToast(`Labour record for EPF ${epfNumber} updated successfully!`, 'success');
    }
  } else {
    // Add new
    labourRecords.unshift(recordData);
    showToast(`New Labour registered successfully with EPF ${epfNumber}!`, 'success');
  }

  saveRecordsToStorage();
  renderTable();
  updateMedicalDueBadge();
  if (activePage === 'appraisalsPage') {
    renderAppraisalDashboard();
  }
  if (activePage === 'medicalPage') {
    renderMedicalDashboard();
  }
  closeModal();
}

// --- In-App Confirmation Modal Engine (Replaces Browser Dialogs) ---
let pendingConfirmCallback = null;

function openConfirmModal({
  title = 'Confirm Deletion',
  titleColor = '#ef4444',
  iconClass = 'fa-solid fa-triangle-exclamation',
  iconColor = '#ef4444',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  labourRecord = null,
  clearAllCount = null,
  confirmText = 'Confirm Delete',
  confirmBtnStyle = 'background: #dc2626; border-color: #ef4444;',
  onConfirm = null
}) {
  const modal = document.getElementById('confirmActionModal');
  const titleTextEl = document.getElementById('confirmModalTitleText');
  const titleEl = document.getElementById('confirmModalTitle');
  const iconEl = document.getElementById('confirmModalIcon');
  const msgEl = document.getElementById('confirmModalMessage');
  const singleCard = document.getElementById('confirmLabourDetailsCard');
  const clearCard = document.getElementById('confirmClearAllCard');
  const btnExecute = document.getElementById('btnExecuteConfirmModal');
  const btnExecuteText = document.getElementById('btnExecuteConfirmText');

  if (!modal) return;

  pendingConfirmCallback = onConfirm;

  if (titleTextEl) titleTextEl.textContent = title;
  if (titleEl) titleEl.style.color = titleColor;
  if (iconEl) {
    iconEl.className = iconClass;
    iconEl.style.color = iconColor;
  }
  if (msgEl) msgEl.textContent = message;

  if (labourRecord) {
    if (singleCard) {
      singleCard.style.display = 'flex';
      const nameEl = document.getElementById('confirmLabourName');
      const metaEl = document.getElementById('confirmLabourMeta');
      if (nameEl) {
        nameEl.textContent = labourRecord.nameWithInitials || labourRecord.firstName || `EPF ${labourRecord.epfNumber}`;
      }
      if (metaEl) {
        metaEl.innerHTML = `
          <span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4);"><i class="fa-solid fa-id-badge"></i> EPF: ${escapeHtml(labourRecord.epfNumber)}</span>
          <span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #cbd5e1;"><i class="fa-solid fa-building"></i> ${escapeHtml(labourRecord.section || 'General')}</span>
          <span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #cbd5e1;"><i class="fa-solid fa-briefcase"></i> ${escapeHtml(labourRecord.designation || 'Labourer')}</span>
          <span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #cbd5e1;"><i class="fa-solid fa-calendar-day"></i> Joined: ${escapeHtml(labourRecord.joinedDate || '-')}</span>
        `;
      }
    }
    if (clearCard) clearCard.style.display = 'none';
  } else if (clearAllCount !== null && clearAllCount !== undefined) {
    if (singleCard) singleCard.style.display = 'none';
    if (clearCard) {
      clearCard.style.display = 'block';
      const countEl = document.getElementById('confirmClearAllCount');
      if (countEl) countEl.textContent = clearAllCount;
    }
  } else {
    if (singleCard) singleCard.style.display = 'none';
    if (clearCard) clearCard.style.display = 'none';
  }

  if (btnExecuteText) btnExecuteText.textContent = confirmText;
  if (btnExecute && confirmBtnStyle) {
    btnExecute.setAttribute('style', `padding: 0.6rem 1.2rem; color: #ffffff; font-weight: 700; display: inline-flex; align-items: center; gap: 0.5rem; ${confirmBtnStyle}`);
  }

  modal.classList.add('active');
}

function closeConfirmModal() {
  const modal = document.getElementById('confirmActionModal');
  if (modal) modal.classList.remove('active');
  pendingConfirmCallback = null;
}

function handleDeleteRecord(identifier, epfFallback) {
  if (currentUser && currentUser.role === 'Viewer') {
    showToast('Viewer accounts have read-only access and cannot delete records.', 'error');
    return;
  }

  const cleanId = identifier != null ? String(identifier).trim() : '';
  const cleanEpf = epfFallback != null ? String(epfFallback).trim() : '';

  const record = labourRecords.find(r => {
    if (!r) return false;
    const rId = r.id != null ? String(r.id).trim() : '';
    const rEpf = r.epfNumber != null ? String(r.epfNumber).trim() : '';
    if (cleanId && (rId === cleanId || rEpf === cleanId)) return true;
    if (cleanEpf && (rEpf === cleanEpf || rId === cleanEpf)) return true;
    return false;
  });

  if (!record) {
    showToast('Labour record could not be found to delete.', 'error');
    return;
  }

  const targetId = record.id != null ? String(record.id).trim() : '';
  const targetEpf = record.epfNumber != null ? String(record.epfNumber).trim() : '';
  const targetName = record.nameWithInitials || record.firstName || `EPF ${targetEpf}`;

  openConfirmModal({
    title: 'Delete Labour Record',
    titleColor: '#ef4444',
    iconClass: 'fa-solid fa-trash-can',
    iconColor: '#ef4444',
    message: `Are you sure you want to permanently delete the labour record for EPF ${targetEpf} (${targetName})? This action cannot be undone.`,
    labourRecord: record,
    confirmText: 'Delete Record',
    confirmBtnStyle: 'background: #dc2626; border-color: #ef4444;',
    onConfirm: () => {
      labourRecords = labourRecords.filter(r => {
        if (!r) return false;
        const rId = r.id != null ? String(r.id).trim() : '';
        const rEpf = r.epfNumber != null ? String(r.epfNumber).trim() : '';
        if (targetId && rId === targetId) return false;
        if (targetEpf && rEpf === targetEpf) return false;
        return true;
      });

      saveRecordsToStorage();
      closeConfirmModal();
      closeModal();
      renderTable();
      renderResignedTable();
      updateAppraisalDueBadge();
      updateMedicalDueBadge();
      if (activePage === 'appraisalsPage') renderAppraisalDashboard();
      if (activePage === 'medicalPage') renderMedicalDashboard();
      if (activePage === 'analyticsPage') renderSectionAnalytics();
      if (activePage === 'resignedPage') renderResignedTable();

      showToast(`Labourer EPF ${targetEpf} (${targetName}) deleted successfully!`, 'success');
    }
  });
}

function handleClearAllLabour() {
  if (currentUser && currentUser.role === 'Viewer') {
    showToast('Viewer accounts have read-only access and cannot clear records.', 'error');
    return;
  }

  if (labourRecords.length === 0) {
    showToast('There are no labour records to clear.', 'info');
    return;
  }

  const count = labourRecords.length;

  openConfirmModal({
    title: '⚠️ Clear All Labour Records',
    titleColor: '#ef4444',
    iconClass: 'fa-solid fa-triangle-exclamation',
    iconColor: '#ef4444',
    message: `⚠️ CRITICAL: You are about to permanently delete ALL ${count} labour records from the system. This includes both active and resigned records. This action cannot be undone!`,
    clearAllCount: count,
    confirmText: `Permanently Delete All (${count}) Records`,
    confirmBtnStyle: 'background: #b91c1c; border-color: #ef4444;',
    onConfirm: () => {
      labourRecords = [];
      saveRecordsToStorage();
      closeConfirmModal();
      closeModal();
      renderTable();
      renderResignedTable();
      updateAppraisalDueBadge();
      updateMedicalDueBadge();
      if (activePage === 'appraisalsPage') renderAppraisalDashboard();
      if (activePage === 'medicalPage') renderMedicalDashboard();
      if (activePage === 'analyticsPage') renderSectionAnalytics();
      if (activePage === 'resignedPage') renderResignedTable();

      showToast(`All ${count} labour records have been permanently cleared!`, 'success');
    }
  });
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
    'Medical Date ( After 2 Months )': r.medicalDate || (r.joinedDate ? addMonthsToDateStr(r.joinedDate, 2) : ''),
    'Medical Status': r.medicalStatus || 'Pending',
    'Service Period': r.servicePeriod || calculateServicePeriod(r.joinedDate, r.resignDate),
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
      { wch: 32 }, // Medical Date ( After 2 Months )
      { wch: 16 }, // Medical Status
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

// ==========================================
// --- Bulk Excel / CSV Import Engine ---
// ==========================================

/**
 * Opens the Excel Import Modal & resets previous file state
 */
function openImportModal() {
  if (currentUser && currentUser.role === 'Viewer') {
    showToast('Viewer accounts have read-only access and cannot import records.', 'error');
    return;
  }
  resetImportState();
  if (excelImportModal) {
    excelImportModal.classList.add('active');
  }
}

/**
 * Closes the Excel Import Modal
 */
function closeImportModal() {
  if (excelImportModal) {
    excelImportModal.classList.remove('active');
  }
  resetImportState();
}

/**
 * Resets file selection, preview, and statistics
 */
function resetImportState() {
  parsedImportRecords = [];
  if (excelFileInput) excelFileInput.value = '';
  if (selectedFileName) selectedFileName.style.display = 'none';
  if (importStatsContainer) importStatsContainer.style.display = 'none';
  if (importPreviewContainer) importPreviewContainer.style.display = 'none';
  if (importPreviewTableBody) importPreviewTableBody.innerHTML = '';
  if (btnConfirmImport) {
    btnConfirmImport.disabled = true;
    if (btnImportCount) btnImportCount.textContent = '0';
  }
}

/**
 * Parses any date value from Excel into YYYY-MM-DD
 * Supports JS Date objects, Excel numeric serials, and date strings (M/D/YYYY, D/M/YYYY, YYYY-MM-DD)
 * Guarantees zero timezone skew across midnight boundaries.
 */
function parseExcelDate(val) {
  if (val === null || val === undefined || val === '') return '';

  // If already Date object (normalize with UTC components to prevent negative timezone offset day-shift)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // If numeric Excel serial code (e.g. 46113)
  if (typeof val === 'number') {
    if (typeof XLSX !== 'undefined' && XLSX.SSF && XLSX.SSF.parse_date_code) {
      try {
        const dObj = XLSX.SSF.parse_date_code(val);
        if (dObj && dObj.y && dObj.m && dObj.d) {
          const y = dObj.y;
          const m = String(dObj.m).padStart(2, '0');
          const d = String(dObj.d).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      } catch (err) {
        // Fallback below
      }
    }
    // Standard Excel epoch: Jan 1 1900 with leap year bug offset (25569) + 12h midday buffer
    if (val > 20000 && val < 90000) {
      const utcDays = Math.floor(val - 25569);
      const dateInfo = new Date((utcDays * 86400 + 43200) * 1000);
      const y = dateInfo.getUTCFullYear();
      const m = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dateInfo.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'null') return '';

  // Match YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (with optional time portion)
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
    const d = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Match M/D/YYYY or D/M/YYYY or DD-MM-YYYY (with optional time portion)
  const slashMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T].*)?$/);
  if (slashMatch) {
    const part1 = parseInt(slashMatch[1], 10);
    const part2 = parseInt(slashMatch[2], 10);
    const year = slashMatch[3];

    let month, day;
    if (part1 > 12) {
      // First part is day (e.g. 24/09/2026 or 24-04-2026)
      day = part1;
      month = part2;
    } else if (part2 > 12) {
      // Second part is day (e.g. 04/24/2026)
      month = part1;
      day = part2;
    } else {
      // Both <= 12: In provided Excel format (4/1/2026, 5/1/2026, 6/1/2026) -> M/D/YYYY
      month = part1;
      day = part2;
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Fallback try standard JS Date
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return formatDateToInput(parsed);
  }

  return '';
}

/**
 * Intelligent full name splitter into nameWithInitials, firstName, and lastName
 */
function splitFullName(fullName) {
  const clean = String(fullName || '').trim().replace(/\s+/g, ' ');
  if (!clean) return { nameWithInitials: '', firstName: '', lastName: '' };

  const parts = clean.split(' ');
  if (parts.length === 1) {
    return { nameWithInitials: clean, firstName: parts[0], lastName: '' };
  } else if (parts.length === 2) {
    return { nameWithInitials: clean, firstName: parts[0], lastName: parts[1] };
  } else {
    // 3 or more words: e.g. "Oddachchi Patabadige Jayantha"
    return {
      nameWithInitials: clean,
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }
}

/**
 * Maps Excel columns to system fields using tolerant, fuzzy header recognition
 * Accurately handles the exact headers from user's image & exported templates:
 * EPF No, FULL NAME, First Name, Last Name, Birth Date, JOINED DATE,
 * 1st Appraisal Date ( After One Month ), Service Period, 1st Appraisal Marks,
 * 2nd Appraissal Date ( After 3 Months ), 2nd Appraissal Marks, RESIGN DATE, Confermetion Letter,
 * 1st JOB ROLLS (designation), 2nd JOB ROLLS (jobRole), SECTION, M / F
 */
function mapHeaderIndices(headerRow) {
  const map = {
    epf: -1,
    gender: -1,
    nameWithInitials: -1,
    fullName: -1,
    firstName: -1,
    lastName: -1,
    birthDate: -1,
    joinedDate: -1,
    firstAppraisalDate: -1,
    medicalDate: -1,
    medicalStatus: -1,
    servicePeriod: -1,
    firstAppraisalMarks: -1,
    secondAppraisalDate: -1,
    secondAppraisalMarks: -1,
    resignDate: -1,
    confirmationLetter: -1,
    designation: -1,
    jobRole: -1,
    section: -1
  };

  const jobRollIndices = [];

  headerRow.forEach((rawH, idx) => {
    if (rawH === null || rawH === undefined) return;
    const h = String(rawH).trim().toLowerCase();
    const clean = h.replace(/[^a-z0-9]/g, '');

    // 1. EPF Number / EPF No
    if (map.epf === -1 && (clean.startsWith('epf') || h.includes('epf') || clean.startsWith('empno') || clean.includes('employeeno') || clean === 'empid' || clean === 'workerid')) {
      map.epf = idx;
    }
    // 2. Gender / M / F
    else if (map.gender === -1 && (clean === 'gender' || clean === 'sex' || clean === 'mf' || clean === 'm/f' || h.includes('m / f') || h.includes('m/f'))) {
      map.gender = idx;
    }
    // 3. Name with Initials
    else if (map.nameWithInitials === -1 && (clean.includes('namewithinitials') || clean.includes('namewithinitial') || h.includes('name with initials') || h.includes('initials'))) {
      map.nameWithInitials = idx;
    }
    // 4. Full Name (fallback)
    else if (map.fullName === -1 && (clean.includes('fullname') || h === 'full name' || h === 'name')) {
      map.fullName = idx;
    }
    // 5. First Name
    else if (map.firstName === -1 && (clean === 'firstname' || clean === 'fname' || h.includes('first name'))) {
      map.firstName = idx;
    }
    // 6. Last Name / Surname
    else if (map.lastName === -1 && (clean === 'lastname' || clean === 'surname' || clean === 'lname' || h.includes('last name'))) {
      map.lastName = idx;
    }
    // 7. Birth Date / DOB
    else if (map.birthDate === -1 && (clean.includes('birth') || clean.includes('dob') || clean.includes('dateofbirth') || h.includes('birth') || h.includes('b.date') || h.includes('bdate'))) {
      map.birthDate = idx;
    }
    // 8. Joined Date
    else if (map.joinedDate === -1 && (clean.includes('joineddate') || clean.includes('joindate') || clean.includes('datejoined') || h.includes('joined date') || h.includes('join date') || clean === 'doj')) {
      map.joinedDate = idx;
    }
    // 9. 1st Appraisal Date ( After One Month )
    else if (map.firstAppraisalDate === -1 && (h.includes('1st') || h.includes('first')) && (h.includes('apprais') || h.includes('appraiss')) && (h.includes('date') || clean.includes('date') || h.includes('after'))) {
      map.firstAppraisalDate = idx;
    }
    // Medical Date ( After 2 Months )
    else if (map.medicalDate === -1 && (clean.includes('medicaldate') || clean.includes('meddate') || h.includes('medical date') || (h.includes('medical') && (h.includes('date') || h.includes('due'))))) {
      map.medicalDate = idx;
    }
    // Medical Status / Result
    else if (map.medicalStatus === -1 && (clean.includes('medicalstatus') || clean.includes('medicalresult') || h.includes('medical status') || h.includes('medical result') || clean === 'medical')) {
      map.medicalStatus = idx;
    }
    // 10. Service Period
    else if (map.servicePeriod === -1 && (clean.includes('serviceperiod') || h.includes('service period') || clean === 'service')) {
      map.servicePeriod = idx;
    }
    // 11. 1st Appraisal Marks
    else if (map.firstAppraisalMarks === -1 && (h.includes('1st') || h.includes('first')) && (h.includes('apprais') || h.includes('appraiss') || clean.includes('mark'))) {
      map.firstAppraisalMarks = idx;
    }
    // 12. 2nd Appraisal Date ( After 3 Months )
    else if (map.secondAppraisalDate === -1 && (h.includes('2nd') || h.includes('second')) && (h.includes('apprais') || h.includes('appraiss')) && (h.includes('date') || clean.includes('date') || h.includes('after'))) {
      map.secondAppraisalDate = idx;
    }
    // 13. 2nd Appraisal Marks
    else if (map.secondAppraisalMarks === -1 && (h.includes('2nd') || h.includes('second')) && (h.includes('apprais') || h.includes('appraiss') || clean.includes('mark'))) {
      map.secondAppraisalMarks = idx;
    }
    // 14. RESIGN DATE
    else if (map.resignDate === -1 && (clean.includes('resigndate') || clean.includes('resignationdate') || h.includes('resign') || clean === 'dor')) {
      map.resignDate = idx;
    }
    // 15. Confermetion Letter (supports 'Confermetion Letter' and 'Confirmation Letter')
    else if (map.confirmationLetter === -1 && (clean.includes('confermetion') || clean.includes('confirmation') || clean.includes('letter'))) {
      map.confirmationLetter = idx;
    }
    // 16. Designation
    else if (map.designation === -1 && (clean.includes('designation') || h.includes('designation') || clean === 'desig')) {
      map.designation = idx;
    }
    // 17. Job Role
    else if (map.jobRole === -1 && (clean.includes('jobrole') || clean.includes('role') || h.includes('job role'))) {
      map.jobRole = idx;
    }
    // Legacy dual JOB ROLLS columns
    else if (clean.includes('jobroll') || h.includes('job roll')) {
      jobRollIndices.push(idx);
    }
    // 18. Section
    else if (map.section === -1 && (clean === 'section' || clean.startsWith('section') || clean.includes('dept') || clean.includes('department'))) {
      map.section = idx;
    }
  });

  // Assign dual JOB ROLLS columns if explicit Designation / Job Role not matched
  if (jobRollIndices.length >= 2) {
    if (map.designation === -1) map.designation = jobRollIndices[0];
    if (map.jobRole === -1) map.jobRole = jobRollIndices[1];
  } else if (jobRollIndices.length === 1) {
    if (map.designation === -1) map.designation = jobRollIndices[0];
    else if (map.jobRole === -1) map.jobRole = jobRollIndices[0];
  }

  // Fallback if nameWithInitials not matched but fullName is
  if (map.nameWithInitials === -1 && map.fullName !== -1) {
    map.nameWithInitials = map.fullName;
  }

  return map;
}

/**
 * Reads and parses selected Excel / CSV file with robust header detection and intra-file duplicate tracking
 */
function handleExcelFileSelected(file) {
  if (!file) return;

  if (typeof XLSX === 'undefined') {
    showToast('Excel processing library is still loading. Please try again.', 'error');
    return;
  }

  // Show selected file name in drop zone
  if (fileNameText) fileNameText.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  if (selectedFileName) selectedFileName.style.display = 'inline-flex';

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      // cellDates: false ensures numbers are kept as Excel serials, eliminating SheetJS timezone skew bugs
      const workbook = XLSX.read(data, { type: 'array', cellDates: false });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        showToast('No sheets found in this Excel file!', 'error');
        return;
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!rawRows || rawRows.length === 0) {
        showToast('The uploaded sheet is completely empty!', 'error');
        return;
      }

      // Robust header detection: find row containing "epf" AND at least one other known field
      let headerRowIndex = -1;
      for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
        const rowStr = rawRows[r].map(c => String(c).toLowerCase()).join(' ');
        const hasEpf = rowStr.includes('epf') || rowStr.includes('emp');
        const hasOther = rowStr.includes('name') || rowStr.includes('join') || rowStr.includes('date') ||
                         rowStr.includes('section') || rowStr.includes('service') || rowStr.includes('roll') || rowStr.includes('gender');
        if (hasEpf && hasOther) {
          headerRowIndex = r;
          break;
        }
      }

      // Fallback: look for row containing "epf" or default to row 0
      if (headerRowIndex === -1) {
        for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
          const rowStr = rawRows[r].map(c => String(c).toLowerCase()).join(' ');
          if (rowStr.includes('epf')) {
            headerRowIndex = r;
            break;
          }
        }
        if (headerRowIndex === -1) headerRowIndex = 0;
      }

      const headerRow = rawRows[headerRowIndex];
      const map = mapHeaderIndices(headerRow);

      if (map.epf === -1) {
        showToast('Could not find "EPF No" column header in Excel file!', 'error');
        return;
      }

      parsedImportRecords = [];
      const seenEpfInFile = new Set();
      let totalFileRows = 0;
      let newCount = 0;
      let existingCount = 0;
      let invalidCount = 0;

      for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        // Check if row is completely blank
        const isBlank = row.every(val => val === '' || val === null || val === undefined);
        if (isBlank) continue;

        totalFileRows++;

        const rawEpf = map.epf !== -1 ? row[map.epf] : '';
        const epfNumber = String(rawEpf !== null && rawEpf !== undefined ? rawEpf : '').trim();

        // 2. Gender
        const rawGender = map.gender !== -1 ? row[map.gender] : '';
        let gender = 'Male';
        const gStr = String(rawGender || '').trim().toLowerCase();
        if (gStr === 'female' || gStr === 'f') gender = 'Female';
        else if (gStr === 'other') gender = 'Other';
        else if (gStr === 'male' || gStr === 'm') gender = 'Male';

        // 3. Name with Initials, First Name, Last Name
        const rawInitials = map.nameWithInitials !== -1 ? String(row[map.nameWithInitials] || '').trim() : '';
        const rawFullName = map.fullName !== -1 ? String(row[map.fullName] || '').trim() : '';
        const rawExplicitFirst = map.firstName !== -1 ? String(row[map.firstName] || '').trim() : '';
        const rawExplicitLast = map.lastName !== -1 ? String(row[map.lastName] || '').trim() : '';

        let nameWithInitials = rawInitials || rawFullName;
        let firstName = rawExplicitFirst;
        let lastName = rawExplicitLast;

        if (nameWithInitials && (!firstName || !lastName)) {
          const split = splitFullName(nameWithInitials);
          if (!firstName) firstName = split.firstName;
          if (!lastName) lastName = split.lastName;
        } else if (!nameWithInitials && (firstName || lastName)) {
          nameWithInitials = (firstName ? firstName.charAt(0).toUpperCase() + ' ' : '') + lastName;
        }
        if (!nameWithInitials) nameWithInitials = epfNumber;

        // 6. Birth Date
        const rawBirth = map.birthDate !== -1 ? row[map.birthDate] : '';
        const birthDate = parseExcelDate(rawBirth);

        // 7. Joined Date
        const rawJoined = map.joinedDate !== -1 ? row[map.joinedDate] : '';
        const joinedDate = parseExcelDate(rawJoined);

        // 13. Resign Date (parsed early so service period can use it if calculating)
        const rawResign = map.resignDate !== -1 ? row[map.resignDate] : '';
        const resignDate = parseExcelDate(rawResign);

        // 8 & 10. 1st Appraisal Date & Marks
        // If provided in Excel, use it directly; if not given, calculate +1 month from joinedDate
        const raw1stDate = map.firstAppraisalDate !== -1 ? row[map.firstAppraisalDate] : '';
        let firstAppraisalDate = parseExcelDate(raw1stDate);
        if (!firstAppraisalDate && joinedDate) {
          firstAppraisalDate = addMonthsToDateStr(joinedDate, 1);
        }
        const raw1stMarks = map.firstAppraisalMarks !== -1 ? row[map.firstAppraisalMarks] : '';
        const firstAppraisalMarks = String(raw1stMarks !== null && raw1stMarks !== undefined ? raw1stMarks : '').trim() || '-';

        // Medical Date & Status (After 2 Months)
        const rawMedDate = map.medicalDate !== -1 ? row[map.medicalDate] : '';
        let medicalDate = parseExcelDate(rawMedDate);
        if (!medicalDate && joinedDate) {
          medicalDate = addMonthsToDateStr(joinedDate, 2);
        }
        const rawMedStatus = map.medicalStatus !== -1 ? String(row[map.medicalStatus] || '').trim() : '';
        const medicalStatus = rawMedStatus || 'Pending';

        // 9. Service Period
        // If provided in Excel, get all data from it; if not given, calculate from joinedDate (and resignDate)
        const rawServicePeriod = map.servicePeriod !== -1 ? String(row[map.servicePeriod] !== null && row[map.servicePeriod] !== undefined ? row[map.servicePeriod] : '').trim() : '';
        let servicePeriod = '';
        const isProvidedService = rawServicePeriod && rawServicePeriod !== '-' && rawServicePeriod.toLowerCase() !== 'n/a' && rawServicePeriod.toLowerCase() !== 'null';
        if (isProvidedService) {
          servicePeriod = rawServicePeriod;
        } else if (joinedDate) {
          servicePeriod = calculateServicePeriod(joinedDate, resignDate);
        }

        // 11 & 12. 2nd Appraisal Date & Marks
        // If provided in Excel, use it directly; if not given, calculate +3 months from joinedDate
        const raw2ndDate = map.secondAppraisalDate !== -1 ? row[map.secondAppraisalDate] : '';
        let secondAppraisalDate = parseExcelDate(raw2ndDate);
        if (!secondAppraisalDate && joinedDate) {
          secondAppraisalDate = addMonthsToDateStr(joinedDate, 3);
        }
        const raw2ndMarks = map.secondAppraisalMarks !== -1 ? row[map.secondAppraisalMarks] : '';
        const secondAppraisalMarks = String(raw2ndMarks !== null && raw2ndMarks !== undefined ? raw2ndMarks : '').trim() || '-';

        // 14. Confirmation Letter
        const rawLetter = map.confirmationLetter !== -1 ? row[map.confirmationLetter] : '';
        let confirmationLetter = String(rawLetter !== null && rawLetter !== undefined ? rawLetter : '').trim();
        if (confirmationLetter.toLowerCase().includes('done')) confirmationLetter = 'Done';
        else if (confirmationLetter.toLowerCase().includes('pending')) confirmationLetter = 'Pending';
        else if (confirmationLetter.toLowerCase().includes('n/a') || confirmationLetter === '-') confirmationLetter = 'N/A';
        else confirmationLetter = confirmationLetter ? 'Done' : 'Pending';

        // 15 & 16. Designation & Job Role
        const designation = map.designation !== -1 ? String(row[map.designation] || '').trim() : '';
        const jobRole = map.jobRole !== -1 ? String(row[map.jobRole] || '').trim() : '';

        // 17. Section
        const section = map.section !== -1 ? String(row[map.section] || '').trim() : '';

        // Validation
        let isInvalid = false;
        let validationMsg = '';
        if (!epfNumber) {
          isInvalid = true;
          validationMsg = 'Missing EPF Number';
        } else if (!joinedDate) {
          isInvalid = true;
          validationMsg = 'Missing Joined Date';
        }

        const isAlreadyInDB = !isInvalid && labourRecords.some(r => r.epfNumber === epfNumber);
        const isDuplicateInFile = !isInvalid && seenEpfInFile.has(epfNumber);
        if (epfNumber) seenEpfInFile.add(epfNumber);

        const isDuplicate = !isInvalid && (isAlreadyInDB || isDuplicateInFile);

        if (isInvalid) {
          invalidCount++;
        } else if (isDuplicate) {
          existingCount++;
        } else {
          newCount++;
        }

        parsedImportRecords.push({
          epfNumber,
          gender,
          nameWithInitials: nameWithInitials || epfNumber,
          firstName,
          lastName,
          birthDate: birthDate || '',
          joinedDate,
          firstAppraisalDate,
          firstAppraisalMarks,
          medicalDate,
          medicalStatus,
          secondAppraisalDate,
          secondAppraisalMarks,
          servicePeriod,
          resignDate,
          confirmationLetter,
          designation,
          jobRole,
          section,
          isInvalid,
          validationMsg,
          isDuplicate,
          isDuplicateInFile,
          computedService: servicePeriod || calculateServicePeriod(joinedDate, resignDate)
        });
      }

      // Update counters
      if (statImportTotal) statImportTotal.textContent = totalFileRows;
      if (statImportNew) statImportNew.textContent = newCount;
      if (statImportExisting) statImportExisting.textContent = existingCount;
      if (statImportInvalid) statImportInvalid.textContent = invalidCount;
      if (importStatsContainer) importStatsContainer.style.display = 'block';

      // Render preview table
      renderImportPreviewTable();

      const validRecordsCount = parsedImportRecords.filter(r => !r.isInvalid).length;
      if (btnConfirmImport) {
        btnConfirmImport.disabled = validRecordsCount === 0;
        if (btnImportCount) btnImportCount.textContent = validRecordsCount;
      }
      if (previewCountText) {
        previewCountText.textContent = `${validRecordsCount} valid / ${totalFileRows} total records ready`;
      }
      if (importPreviewContainer) {
        importPreviewContainer.style.display = 'flex';
      }

      if (validRecordsCount > 0) {
        showToast(`Parsed ${totalFileRows} rows: ${newCount} new, ${existingCount} duplicate, ${invalidCount} invalid`, 'success');
      } else {
        showToast('No valid records found to import. Please check file format.', 'error');
      }

    } catch (err) {
      console.error('Failed to parse Excel file', err);
      showToast('Error reading Excel file: ' + err.message, 'error');
    }
  };

  reader.readAsArrayBuffer(file);
}

/**
 * Renders the preview table inside the modal
 */
function renderImportPreviewTable() {
  if (!importPreviewTableBody) return;
  importPreviewTableBody.innerHTML = '';

  parsedImportRecords.forEach(rec => {
    const tr = document.createElement('tr');
    
    let statusBadge = '';
    if (rec.isInvalid) {
      statusBadge = `<span class="badge-import-error" title="${escapeHtml(rec.validationMsg)}"><i class="fa-solid fa-circle-xmark"></i> ${escapeHtml(rec.validationMsg)}</span>`;
    } else if (rec.isDuplicateInFile) {
      statusBadge = `<span class="badge-import-update" title="Duplicate EPF repeated in file"><i class="fa-solid fa-clone"></i> Duplicate in File</span>`;
    } else if (rec.isDuplicate) {
      statusBadge = `<span class="badge-import-update" title="EPF already exists in database"><i class="fa-solid fa-arrows-rotate"></i> Update/Existing</span>`;
    } else {
      statusBadge = `<span class="badge-import-new"><i class="fa-solid fa-circle-plus"></i> New Labour</span>`;
    }

    const dispService = rec.servicePeriod || rec.computedService || '-';

    tr.innerHTML = `
      <td>${statusBadge}</td>
      <td class="cell-epf"><strong>${escapeHtml(rec.epfNumber || '-')}</strong></td>
      <td>${escapeHtml(rec.gender || '-')}</td>
      <td><strong>${escapeHtml(rec.nameWithInitials || '-')}</strong></td>
      <td>${escapeHtml(rec.joinedDate || '-')}</td>
      <td>${escapeHtml(rec.birthDate || '-')}</td>
      <td>${escapeHtml(rec.firstAppraisalDate || '-')} <small>(${escapeHtml(rec.firstAppraisalMarks || '-')})</small></td>
      <td><span class="cell-service-period" style="font-size: 0.75rem;">${escapeHtml(dispService)}</span></td>
      <td>${escapeHtml(rec.secondAppraisalDate || '-')} <small>(${escapeHtml(rec.secondAppraisalMarks || '-')})</small></td>
      <td>${escapeHtml(rec.resignDate || '-')}</td>
      <td><span class="badge ${rec.confirmationLetter === 'Done' ? 'badge-ok' : 'badge-duesoon'}">${escapeHtml(rec.confirmationLetter || 'Pending')}</span></td>
      <td>${escapeHtml(rec.designation || '-')}</td>
      <td>${escapeHtml(rec.jobRole || '-')}</td>
      <td>${escapeHtml(rec.section || '-')}</td>
    `;
    importPreviewTableBody.appendChild(tr);
  });
}

/**
 * Handles confirmation and committing records into storage
 */
function handleConfirmImport() {
  const duplicatePolicy = document.querySelector('input[name="importDuplicateAction"]:checked')?.value || 'update';
  const validRecords = parsedImportRecords.filter(r => !r.isInvalid);

  if (validRecords.length === 0) {
    showToast('No valid records to import!', 'error');
    return;
  }

  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  validRecords.forEach(rec => {
    const existingIndex = labourRecords.findIndex(r => r.epfNumber === rec.epfNumber);

    if (existingIndex !== -1) {
      if (duplicatePolicy === 'update') {
        const existing = labourRecords[existingIndex];
        labourRecords[existingIndex] = {
          ...existing,
          gender: rec.gender || existing.gender,
          nameWithInitials: rec.nameWithInitials || existing.nameWithInitials,
          firstName: rec.firstName || existing.firstName,
          lastName: rec.lastName || existing.lastName,
          birthDate: rec.birthDate || existing.birthDate,
          joinedDate: rec.joinedDate || existing.joinedDate,
          firstAppraisalDate: rec.firstAppraisalDate || existing.firstAppraisalDate,
          firstAppraisalMarks: rec.firstAppraisalMarks !== '-' ? rec.firstAppraisalMarks : existing.firstAppraisalMarks,
          medicalDate: rec.medicalDate || existing.medicalDate || (rec.joinedDate ? addMonthsToDateStr(rec.joinedDate, 2) : ''),
          medicalStatus: rec.medicalStatus || existing.medicalStatus || 'Pending',
          secondAppraisalDate: rec.secondAppraisalDate || existing.secondAppraisalDate,
          secondAppraisalMarks: rec.secondAppraisalMarks !== '-' ? rec.secondAppraisalMarks : existing.secondAppraisalMarks,
          servicePeriod: rec.servicePeriod || existing.servicePeriod || (rec.joinedDate ? calculateServicePeriod(rec.joinedDate, rec.resignDate || existing.resignDate) : existing.servicePeriod),
          resignDate: rec.resignDate || existing.resignDate,
          confirmationLetter: rec.confirmationLetter || existing.confirmationLetter,
          designation: rec.designation || existing.designation,
          jobRole: rec.jobRole || existing.jobRole,
          section: rec.section || existing.section,
          updatedAt: new Date().toISOString()
        };
        updatedCount++;
      } else {
        skippedCount++;
      }
    } else {
      const newRecord = {
        id: 'REC_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        epfNumber: rec.epfNumber,
        gender: rec.gender,
        nameWithInitials: rec.nameWithInitials,
        firstName: rec.firstName,
        lastName: rec.lastName,
        birthDate: rec.birthDate || '',
        joinedDate: rec.joinedDate,
        firstAppraisalDate: rec.firstAppraisalDate,
        firstAppraisalMarks: rec.firstAppraisalMarks,
        medicalDate: rec.medicalDate || (rec.joinedDate ? addMonthsToDateStr(rec.joinedDate, 2) : ''),
        medicalStatus: rec.medicalStatus || 'Pending',
        secondAppraisalDate: rec.secondAppraisalDate,
        secondAppraisalMarks: rec.secondAppraisalMarks,
        servicePeriod: rec.servicePeriod || (rec.joinedDate ? calculateServicePeriod(rec.joinedDate, rec.resignDate) : ''),
        resignDate: rec.resignDate,
        confirmationLetter: rec.confirmationLetter,
        designation: rec.designation,
        jobRole: rec.jobRole,
        section: rec.section,
        updatedAt: new Date().toISOString()
      };
      labourRecords.unshift(newRecord);
      importedCount++;
    }
  });

  saveRecordsToStorage();
  renderTable();
  renderResignedTable();
  updateStats();
  updateSectionFilterOptions();
  updateAppraisalDueBadge();
  updateMedicalDueBadge();
  if (activePage === 'appraisalsPage') renderAppraisalDashboard();
  if (activePage === 'medicalPage') renderMedicalDashboard();
  if (activePage === 'analyticsPage') renderSectionAnalytics();

  closeImportModal();

  let toastMsg = `Bulk Import Complete: ${importedCount} added`;
  if (updatedCount > 0) toastMsg += `, ${updatedCount} updated`;
  if (skippedCount > 0) toastMsg += `, ${skippedCount} skipped`;
  showToast(toastMsg, 'success');
}

/**
 * Downloads a sample Excel template (.xlsx) with exact headers matching the user's spreadsheet
 */
function downloadImportTemplate() {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library loading, please try again in a moment.', 'error');
    return;
  }

  const templateHeaders = [
    'EPF Number',
    'Gender',
    'Name with Initials',
    'First Name',
    'Last Name',
    'Birth Date',
    'Joined Date',
    '1st Appraisal Date ( After One Month )',
    'Medical Date ( After 2 Months )',
    'Service Period',
    '1st Appraisal Marks',
    '2nd Appraisal Date ( After 3 Months )',
    '2nd Appraisal Marks',
    'RESIGN DATE',
    'Confermetion Letter',
    'Designation',
    'Job Role',
    'Section'
  ];

  const sampleRow = [
    '1325',
    'Male',
    'Oddachchi Patabadige Jayantha',
    'Oddachchi',
    'Patabadige Jayantha',
    '1995-08-15',
    '2026-04-01',
    '2026-05-01',
    '2026-06-01',
    '0 Years, 5 Months, 28 Days',
    '-',
    '2026-07-01',
    '-',
    '',
    'Pending',
    'Production helper',
    'Hatcheting',
    'Yard A'
  ];

  const wsData = [templateHeaders, sampleRow];
  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  // Column width styling matching exact 18 headers
  worksheet['!cols'] = [
    { wch: 14 }, // EPF Number
    { wch: 10 }, // Gender
    { wch: 32 }, // Name with Initials
    { wch: 16 }, // First Name
    { wch: 22 }, // Last Name
    { wch: 14 }, // Birth Date
    { wch: 14 }, // Joined Date
    { wch: 38 }, // 1st Appraisal Date ( After One Month )
    { wch: 34 }, // Medical Date ( After 2 Months )
    { wch: 28 }, // Service Period
    { wch: 20 }, // 1st Appraisal Marks
    { wch: 38 }, // 2nd Appraisal Date ( After 3 Months )
    { wch: 20 }, // 2nd Appraisal Marks
    { wch: 14 }, // RESIGN DATE
    { wch: 22 }, // Confermetion Letter
    { wch: 24 }, // Designation
    { wch: 24 }, // Job Role
    { wch: 18 }  // Section
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Labour Template');
  XLSX.writeFile(workbook, 'Labour_Import_Template.xlsx');
  showToast('Sample Excel template downloaded!', 'success');
}

function switchPage(pageId) {
  activePage = pageId;
  const pages = ['directoryPage', 'appraisalsPage', 'medicalPage', 'resignedPage', 'analyticsPage', 'usersPage'];
  const tabs = ['tabDirectory', 'tabAppraisals', 'tabMedical', 'tabResigned', 'tabAnalytics', 'tabUsers'];

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

  if (pageId === 'directoryPage') {
    renderTable();
  } else if (pageId === 'appraisalsPage') {
    renderAppraisalDashboard();
  } else if (pageId === 'medicalPage') {
    renderMedicalDashboard();
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
    if (inputMedicalDate) inputMedicalDate.addEventListener(evtType, () => updateLiveCalculations(false));
    inputSecondAppraisal.addEventListener(evtType, () => updateLiveCalculations(false));
  });

  // Resign Modal Handlers
  function openResignModal(recordId, epfFallback) {
    const record = labourRecords.find(r => 
      (r.id && (r.id === recordId || String(r.id) === String(recordId))) ||
      (r.epfNumber && (String(r.epfNumber) === String(recordId) || String(r.epfNumber) === String(epfFallback)))
    );
    if (!record) return;

    document.getElementById('resignLabourId').value = record.id || record.epfNumber;
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

    const record = labourRecords.find(r => 
      (r.id && (r.id === recordId || String(r.id) === String(recordId))) ||
      (r.epfNumber && String(r.epfNumber) === String(recordId))
    );
    if (!record) return;

    record.resignDate = resignDate;
    record.updatedAt = new Date().toISOString();

    saveRecordsToStorage();
    renderTable();
    renderResignedTable();
    updateAppraisalDueBadge();
    updateMedicalDueBadge();
    if (activePage === 'appraisalsPage') renderAppraisalDashboard();
    if (activePage === 'medicalPage') renderMedicalDashboard();
    if (activePage === 'analyticsPage') renderSectionAnalytics();

    closeResignModal();
    showToast(`Labourer EPF ${record.epfNumber} (${record.nameWithInitials}) marked as Resigned!`, 'success');
  }

  function handleReactivateLabour(recordId, epfFallback) {
    const cleanId = recordId != null ? String(recordId).trim() : '';
    const cleanEpf = epfFallback != null ? String(epfFallback).trim() : '';

    const record = labourRecords.find(r => {
      if (!r) return false;
      const rId = r.id != null ? String(r.id).trim() : '';
      const rEpf = r.epfNumber != null ? String(r.epfNumber).trim() : '';
      if (cleanId && (rId === cleanId || rEpf === cleanId)) return true;
      if (cleanEpf && (rEpf === cleanEpf || rId === cleanEpf)) return true;
      return false;
    });
    if (!record) return;

    openConfirmModal({
      title: 'Re-activate Labourer',
      titleColor: 'var(--accent-green)',
      iconClass: 'fa-solid fa-user-check',
      iconColor: 'var(--accent-green)',
      message: `Re-activate labourer EPF ${record.epfNumber} (${record.nameWithInitials || record.firstName}) and remove resignation status?`,
      labourRecord: record,
      confirmText: 'Confirm Re-activation',
      confirmBtnStyle: 'background: #059669; border-color: #10b981;',
      onConfirm: () => {
        record.resignDate = '';
        record.updatedAt = new Date().toISOString();

        saveRecordsToStorage();
        closeConfirmModal();
        renderTable();
        renderResignedTable();
        updateAppraisalDueBadge();
        updateMedicalDueBadge();
        if (activePage === 'appraisalsPage') renderAppraisalDashboard();
        if (activePage === 'medicalPage') renderMedicalDashboard();
        if (activePage === 'analyticsPage') renderSectionAnalytics();
        if (activePage === 'resignedPage') renderResignedTable();

        showToast(`Labourer EPF ${record.epfNumber} re-activated successfully!`, 'success');
      }
    });
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
        const record = labourRecords.find(r => 
          (r.id && (r.id === recordId || String(r.id) === String(recordId))) ||
          (r.epfNumber && String(r.epfNumber) === String(recordId))
        );
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
      const epf = btnEdit.dataset.epf;
      const record = labourRecords.find(r => 
        (r.id && (r.id === id || String(r.id) === String(id))) ||
        (r.epfNumber && (String(r.epfNumber) === String(id) || String(r.epfNumber) === String(epf)))
      );
      if (record) openModal(true, record);
    } else if (btnDelete) {
      const id = btnDelete.dataset.id;
      const epf = btnDelete.dataset.epf;
      handleDeleteRecord(id, epf);
    } else if (btnResign) {
      const id = btnResign.dataset.id;
      const epf = btnResign.dataset.epf;
      openResignModal(id, epf);
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
        handleReactivateLabour(btnReactivate.dataset.id, btnReactivate.dataset.epf);
      } else if (btnEdit) {
        const id = btnEdit.dataset.id;
        const epf = btnEdit.dataset.epf;
        const record = labourRecords.find(r => 
          (r.id && (r.id === id || String(r.id) === String(id))) ||
          (r.epfNumber && (String(r.epfNumber) === String(id) || String(r.epfNumber) === String(epf)))
        );
        if (record) openModal(true, record);
      } else if (btnDelete) {
        handleDeleteRecord(btnDelete.dataset.id, btnDelete.dataset.epf);
      }
    });
  }

  // Clear All Labours Handler
  const btnClearAllLabour = document.getElementById('btnClearAllLabour');
  if (btnClearAllLabour) {
    btnClearAllLabour.addEventListener('click', handleClearAllLabour);
  }

  // Confirm Action Modal Listeners
  const confirmModalEl = document.getElementById('confirmActionModal');
  const btnCloseConfirmModalEl = document.getElementById('btnCloseConfirmModal');
  const btnCancelConfirmModalEl = document.getElementById('btnCancelConfirmModal');
  const btnExecuteConfirmModalEl = document.getElementById('btnExecuteConfirmModal');

  if (confirmModalEl) {
    confirmModalEl.addEventListener('click', (e) => {
      if (e.target === confirmModalEl) closeConfirmModal();
    });
  }
  if (btnCloseConfirmModalEl) btnCloseConfirmModalEl.addEventListener('click', closeConfirmModal);
  if (btnCancelConfirmModalEl) btnCancelConfirmModalEl.addEventListener('click', closeConfirmModal);
  if (btnExecuteConfirmModalEl) {
    btnExecuteConfirmModalEl.addEventListener('click', () => {
      if (typeof pendingConfirmCallback === 'function') {
        pendingConfirmCallback();
      }
    });
  }

  // Global Escape key to close any active modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeConfirm = document.getElementById('confirmActionModal');
      if (activeConfirm && activeConfirm.classList.contains('active')) {
        closeConfirmModal();
        return;
      }
      const activeLabour = document.getElementById('labourModal');
      if (activeLabour && activeLabour.classList.contains('active')) {
        closeModal();
        return;
      }
      const activeResign = document.getElementById('resignModal');
      if (activeResign && activeResign.classList.contains('active')) {
        closeResignModal();
        return;
      }
      const activeImport = document.getElementById('excelImportModal');
      if (activeImport && activeImport.classList.contains('active')) {
        closeExcelImportModal();
        return;
      }
      const activeUser = document.getElementById('userModal');
      if (activeUser && activeUser.classList.contains('active')) {
        closeUserModal();
        return;
      }
    }
  });

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

  const userForm = document.getElementById('userForm');
  if (userForm) userForm.addEventListener('submit', saveUserRecord);

  const userPasswordInput = document.getElementById('userPassword');
  if (userPasswordInput) {
    ['input', 'change', 'keyup'].forEach(evt => {
      userPasswordInput.addEventListener(evt, () => {
        updatePasswordStrengthUI(userPasswordInput.value);
      });
    });
  }

  const btnToggleUserPw = document.getElementById('btnToggleUserPw');
  if (btnToggleUserPw) {
    btnToggleUserPw.addEventListener('click', () => {
      const pwInput = document.getElementById('userPassword');
      const iconPw = document.getElementById('iconToggleUserPw');
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
  const tabMedicalEl = document.getElementById('tabMedical');
  if (tabMedicalEl) tabMedicalEl.addEventListener('click', () => switchPage('medicalPage'));
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

  // Medical Due Table click handlers (Mark, Edit, Resign)
  const bodyMedical = document.getElementById('bodyMedicalDue');
  if (bodyMedical) {
    bodyMedical.addEventListener('click', (e) => {
      const btnMark = e.target.closest('.btn-mark-medical');
      const btnEdit = e.target.closest('.btn-edit-medical');
      const btnResign = e.target.closest('.btn-resign-medical');
      if (btnMark) {
        const recordId = btnMark.dataset.id;
        openMedicalModal(recordId);
      } else if (btnEdit) {
        const recordId = btnEdit.dataset.id;
        const record = labourRecords.find(r => 
          (r.id && (r.id === recordId || String(r.id) === String(recordId))) ||
          (r.epfNumber && String(r.epfNumber) === String(recordId))
        );
        if (record) openModal(true, record);
      } else if (btnResign) {
        const recordId = btnResign.dataset.id;
        openResignModal(recordId);
      }
    });
  }

  // Medical Filter & Toolbar Handlers
  const searchMed = document.getElementById('searchMedicalInput');
  const filterMedStatus = document.getElementById('filterMedicalDueStatus');
  const filterMedSec = document.getElementById('filterMedicalSection');
  const btnClearMedFilters = document.getElementById('btnClearMedicalFilters');
  const btnExportMed = document.getElementById('btnExportMedicalExcel');

  if (searchMed) searchMed.addEventListener('input', renderMedicalDashboard);
  if (filterMedStatus) filterMedStatus.addEventListener('change', renderMedicalDashboard);
  if (filterMedSec) filterMedSec.addEventListener('change', renderMedicalDashboard);
  if (btnClearMedFilters) {
    btnClearMedFilters.addEventListener('click', () => {
      if (searchMed) searchMed.value = '';
      if (filterMedStatus) filterMedStatus.value = 'pendingAction';
      if (filterMedSec) filterMedSec.value = '';
      renderMedicalDashboard();
    });
  }
  if (btnExportMed) {
    btnExportMed.addEventListener('click', exportMedicalReport);
  }

  // Quick Medical Record Modal Event Listeners
  const btnCloseMedModal = document.getElementById('btnCloseMedicalModal');
  const btnCancelMedModal = document.getElementById('btnCancelMedicalModal');
  const btnSaveMedModal = document.getElementById('btnSaveMedicalModal');
  const medRecordModal = document.getElementById('medicalRecordModal');

  if (btnCloseMedModal) btnCloseMedModal.addEventListener('click', closeMedicalModal);
  if (btnCancelMedModal) btnCancelMedModal.addEventListener('click', closeMedicalModal);
  if (btnSaveMedModal) btnSaveMedModal.addEventListener('click', saveMedicalRecordModal);
  if (medRecordModal) {
    medRecordModal.addEventListener('click', (e) => {
      if (e.target === medRecordModal) closeMedicalModal();
    });
  }

  // Excel Export Handler
  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', exportToExcel);
  }

  // Bulk Excel Import Event Handlers
  if (btnImportExcel) {
    btnImportExcel.addEventListener('click', openImportModal);
  }
  if (btnCloseImportModal) {
    btnCloseImportModal.addEventListener('click', closeImportModal);
  }
  if (btnCancelImportModal) {
    btnCancelImportModal.addEventListener('click', closeImportModal);
  }
  if (excelImportModal) {
    excelImportModal.addEventListener('click', (e) => {
      if (e.target === excelImportModal) closeImportModal();
    });
  }
  if (btnDownloadTemplate) {
    btnDownloadTemplate.addEventListener('click', downloadImportTemplate);
  }
  if (btnConfirmImport) {
    btnConfirmImport.addEventListener('click', handleConfirmImport);
  }
  if (importDropZone && excelFileInput) {
    importDropZone.addEventListener('click', (e) => {
      if (e.target.closest('#btnClearFile')) return;
      excelFileInput.click();
    });

    excelFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleExcelFileSelected(e.target.files[0]);
      }
    });

    // Drag & Drop handlers
    ['dragenter', 'dragover'].forEach(evt => {
      importDropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        importDropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'dragend'].forEach(evt => {
      importDropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        importDropZone.classList.remove('dragover');
      });
    });

    importDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      importDropZone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleExcelFileSelected(e.dataTransfer.files[0]);
      }
    });
  }

  if (btnClearFile) {
    btnClearFile.addEventListener('click', (e) => {
      e.stopPropagation();
      resetImportState();
    });
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

// Expose global handlers for accessibility & event delegation fallbacks
window.handleDeleteRecord = handleDeleteRecord;
window.handleClearAllLabour = handleClearAllLabour;
window.openConfirmModal = openConfirmModal;
window.closeConfirmModal = closeConfirmModal;

