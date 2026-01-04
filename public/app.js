// Frontend logic for Student Record Web App
const API = '/api';
let token = localStorage.getItem('token') || null;
let role = localStorage.getItem('role') || 'admin';

const loginView = document.getElementById('loginView');
const appView = document.getElementById('appView');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const sessionUser = document.getElementById('sessionUser');
const roleRadios = Array.from(document.querySelectorAll('input[name="role"]'));
const adminLogin = document.getElementById('adminLogin');
const studentLogin = document.getElementById('studentLogin');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const registerView = document.getElementById('registerView');
const registerBtn = document.getElementById('registerBtn');
const cancelRegisterBtn = document.getElementById('cancelRegisterBtn');
const registerMsg = document.getElementById('registerMsg');

// Tab functionality
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    
    // Remove active class from all buttons and panels
    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    
    // Add active class to clicked button and corresponding panel
    btn.classList.add('active');
    document.getElementById(tabId).classList.add('active');
  });
});

roleRadios.forEach(r => r.addEventListener('change', () => {
  role = document.querySelector('input[name="role"]:checked').value;
  adminLogin.classList.toggle('hidden', role !== 'admin');
  studentLogin.classList.toggle('hidden', role !== 'student');
}));

showRegisterBtn.addEventListener('click', () => { registerMsg.classList.add('hidden'); loginView.classList.add('hidden'); registerView.classList.remove('hidden'); });
cancelRegisterBtn.addEventListener('click', () => { registerView.classList.add('hidden'); loginView.classList.remove('hidden'); });

loginBtn.addEventListener('click', async () => {
  loginError.classList.add('hidden');
  try {
    if (role === 'admin') {
      const username = document.getElementById('loginUser').value.trim();
      const password = document.getElementById('loginPass').value.trim();
      const res = await fetch(`${API}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      token = data.token; localStorage.setItem('token', token); localStorage.setItem('role', 'admin');
      sessionUser.textContent = `👤 Admin: ${username}`;
    } else {
      const email = document.getElementById('stuLoginEmail').value.trim();
      const password = document.getElementById('stuLoginPass').value.trim();
      const res = await fetch(`${API}/students/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      token = data.token; localStorage.setItem('token', token); localStorage.setItem('role', 'student');
      localStorage.setItem('studentEmail', email);
      sessionUser.textContent = `🎓 Student`;
    }
    showApp();
  } catch (err) { loginError.textContent = err.message; loginError.classList.remove('hidden'); }
});

logoutBtn.addEventListener('click', () => { token = null; localStorage.removeItem('token'); localStorage.removeItem('role'); localStorage.removeItem('studentEmail'); hideApp(); });

function authHeaders() { return token ? { 'Authorization': `Bearer ${token}` } : {}; }

async function showApp() { 
  loginView.classList.add('hidden'); 
  appView.classList.remove('hidden'); 
  toggleAdminOnlyUI(); 
  
  // Set session user display
  const storedRole = localStorage.getItem('role');
  if (storedRole === 'admin') {
    sessionUser.textContent = '👤 Admin';
  } else if (storedRole === 'student') {
    sessionUser.textContent = '🎓 Student';
  }
  
  await refreshAll(); 
}
function hideApp() { appView.classList.add('hidden'); loginView.classList.remove('hidden'); }

// Initialize app if token exists
(async () => {
  if (token) { await showApp(); }
})();

// Elements
const stuName = document.getElementById('stuName');
const stuEmail = document.getElementById('stuEmail');
const stuYear = document.getElementById('stuYear');
const addStudentBtn = document.getElementById('addStudentBtn');
const addStudentMsg = document.getElementById('addStudentMsg');
const studentsTableBody = document.querySelector('#studentsTable tbody');

addStudentBtn.addEventListener('click', async () => {
  addStudentMsg.classList.add('hidden');
  try {
    const body = { name: stuName.value.trim(), email: stuEmail.value.trim(), year: stuYear.value.trim() };
    const res = await fetch(`${API}/students`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    stuName.value = stuEmail.value = stuYear.value = '';
    refreshStudents(); refreshCounts(); populateStudentSelects();
  } catch (err) {
    addStudentMsg.textContent = err.message; addStudentMsg.classList.remove('hidden');
  }
});

// Attendance
const attStudent = document.getElementById('attStudent');
const attDate = document.getElementById('attDate');
const attStatus = document.getElementById('attStatus');
const attNote = document.getElementById('attNote');
const markAttendanceBtn = document.getElementById('markAttendanceBtn');
const attMsg = document.getElementById('attMsg');
const attendanceTableBody = document.querySelector('#attendanceTable tbody');

markAttendanceBtn.addEventListener('click', async () => {
  attMsg.classList.add('hidden');
  try {
    const body = { studentId: attStudent.value, date: attDate.value, status: attStatus.value, note: attNote.value };
    const res = await fetch(`${API}/attendance`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    attDate.value = ''; attNote.value='';
    refreshAttendance(); refreshCounts();
  } catch (err) { attMsg.textContent = err.message; attMsg.classList.remove('hidden'); }
});

// Activities
const actType = document.getElementById('actType');
const actDesc = document.getElementById('actDesc');
const addActivityBtn = document.getElementById('addActivityBtn');
const actMsg = document.getElementById('actMsg');
const activitiesTableBody = document.querySelector('#activitiesTable tbody');

addActivityBtn.addEventListener('click', async () => {
  actMsg.classList.add('hidden');
  actMsg.className = 'hidden';
  
  if (!actDesc.value.trim()) {
    actMsg.textContent = 'Please enter an activity description';
    actMsg.className = 'error';
    return;
  }
  
  try {
    // Add activity for all students
    let successCount = 0;
    let failCount = 0;
    
    for (const student of studentsCache) {
      try {
        const body = { studentId: student.id, type: actType.value, description: actDesc.value };
        const res = await fetch(`${API}/activities`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(body) });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
      }
    }
    
    actDesc.value = '';
    refreshActivities(); 
    refreshCounts();
    
    if (failCount === 0) {
      actMsg.textContent = `✅ Activity added for ${successCount} student(s)`;
      actMsg.className = 'success';
    } else {
      actMsg.textContent = `⚠️ Added for ${successCount} student(s), failed for ${failCount}`;
      actMsg.className = 'error';
    }
  } catch (err) { 
    actMsg.textContent = err.message; 
    actMsg.className = 'error';
  }
});

async function refreshStudents() {
  if (localStorage.getItem('role') === 'student') {
    // Students don't see all students; show just self
    const me = await (await fetch(`${API}/me`, { headers: authHeaders() })).json();
    const s = me.student ? [me.student] : [];
    studentsCache = s;
    studentsTableBody.innerHTML = s.map(s => `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.email)}</td><td>${escapeHtml(s.year ?? s.cohort ?? '')}</td><td>${s.status}</td><td>${s.enrolledOn}</td></tr>`).join('');
    return s;
  }
  const res = await fetch(`${API}/students`, { headers: authHeaders() });
  const data = await res.json();
  studentsTableBody.innerHTML = data.map(s => `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.email)}</td><td>${escapeHtml(s.year ?? s.cohort ?? '')}</td><td>${s.status}</td><td>${s.enrolledOn}</td></tr>`).join('');
  return data;
}

async function refreshAttendance() {
  const isStudent = localStorage.getItem('role') === 'student';
  const url = isStudent ? `${API}/my/attendance` : `${API}/attendance`;
  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json();
  attendanceTableBody.innerHTML = data.slice(-25).reverse().map(a => {
    const statusClass = a.status === 'present' ? 'style="color:#059669;font-weight:600;"' : 
                        a.status === 'absent' ? 'style="color:#dc2626;font-weight:600;"' : 
                        'style="color:#d97706;font-weight:600;"';
    const statusIcon = a.status === 'present' ? '✅' : a.status === 'absent' ? '❌' : '⏰';
    return `<tr><td>${a.date}</td><td>${lookupName(a.studentId)}</td><td ${statusClass}>${statusIcon} ${a.status}</td><td>${escapeHtml(a.note||'')}</td></tr>`;
  }).join('');
  return data;
}

async function refreshActivities() {
  const isStudent = localStorage.getItem('role') === 'student';
  const url = isStudent ? `${API}/my/activities` : `${API}/activities`;
  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json();
  activitiesTableBody.innerHTML = data.slice(-25).reverse().map(a => {
    const typeIcon = a.type === 'assignment' ? '📄' : 
                     a.type === 'quiz' ? '📝' : 
                     a.type === 'participation' ? '🙋' : '📌';
    const typeStyle = a.type === 'assignment' ? 'style="color:#2563eb;"' :
                      a.type === 'quiz' ? 'style="color:#d97706;"' :
                      a.type === 'participation' ? 'style="color:#059669;"' : 'style="color:#6b7280;"';
    return `<tr><td>${a.timestamp}</td><td>${lookupName(a.studentId)}</td><td ${typeStyle}>${typeIcon} ${a.type}</td><td>${escapeHtml(a.description)}</td></tr>`;
  }).join('');
  return data;
}

function populateStudentSelects() {
  const selects = [attStudent];
  const options = studentsCache.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  selects.forEach(sel => { if (sel) sel.innerHTML = options; });
}

let studentsCache = [];
function lookupName(id) { const s = studentsCache.find(x => x.id === id); return s ? s.name : id; }

async function refreshCounts() {
  // Update total students
  document.getElementById('totalStudents').textContent = studentsCache.length;
  
  const isStudent = localStorage.getItem('role') === 'student';
  const attRes = await fetch(isStudent ? `${API}/my/attendance` : `${API}/attendance`, { headers: authHeaders() });
  const attData = await attRes.json();
  document.getElementById('totalAttendance').textContent = attData.length;
  
  // Calculate attendance stats
  const presentCount = attData.filter(a => a.status === 'present').length;
  const absentCount = attData.filter(a => a.status === 'absent').length;
  const lateCount = attData.filter(a => a.status === 'late').length;
  
  // Update quick stats
  const presentCountEl = document.getElementById('presentCount');
  const absentCountEl = document.getElementById('absentCount');
  const lateCountEl = document.getElementById('lateCount');
  if (presentCountEl) presentCountEl.textContent = presentCount;
  if (absentCountEl) absentCountEl.textContent = absentCount;
  if (lateCountEl) lateCountEl.textContent = lateCount;
  
  // Calculate present rate
  const totalRecords = attData.length;
  const presentRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
  document.getElementById('presentToday').textContent = `${presentRate}%`;
  
  const actRes = await fetch(isStudent ? `${API}/my/activities` : `${API}/activities`, { headers: authHeaders() });
  const actData = await actRes.json();
  document.getElementById('totalActivities').textContent = actData.length;
}

async function refreshAll() {
  studentsCache = await refreshStudents();
  populateStudentSelects();
  await refreshAttendance();
  await refreshActivities();
  await refreshCounts();
}

function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c])); }

// Registration
registerBtn?.addEventListener('click', async () => {
  registerMsg.classList.add('hidden');
  try {
    const body = { name: document.getElementById('regName').value.trim(), email: document.getElementById('regEmail').value.trim(), year: document.getElementById('regYear').value.trim(), password: document.getElementById('regPass').value };
    const res = await fetch(`${API}/students/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    alert('Registration successful. Please login as Student.');
    registerView.classList.add('hidden'); loginView.classList.remove('hidden');
  } catch (err) { registerMsg.textContent = err.message; registerMsg.classList.remove('hidden'); }
});

function toggleAdminOnlyUI() {
  const isStudent = localStorage.getItem('role') === 'student';
  const adminPanels = document.getElementById('adminPanels');
  if (adminPanels) adminPanels.classList.toggle('hidden', isStudent);
  const studentsCard = document.getElementById('studentsCard');
  if (studentsCard) studentsCard.classList.toggle('hidden', isStudent);
  const statsGrid = document.getElementById('statsGrid');
  if (statsGrid) statsGrid.classList.toggle('hidden', isStudent);
  const studentDashboard = document.getElementById('studentDashboard');
  if (studentDashboard) studentDashboard.classList.toggle('hidden', !isStudent);
  
  // Update card titles for student view
  const attendanceCardTitle = document.getElementById('attendanceCardTitle');
  const activitiesCardTitle = document.getElementById('activitiesCardTitle');
  if (attendanceCardTitle) attendanceCardTitle.textContent = isStudent ? '📋 My Attendance History' : '📋 Recent Attendance';
  if (activitiesCardTitle) activitiesCardTitle.textContent = isStudent ? '⚡ My Activities' : '⚡ Recent Activities';
  
  // Load student profile if student
  if (isStudent) {
    loadStudentProfile();
  }
}

async function loadStudentProfile() {
  try {
    const meRes = await fetch(`${API}/me`, { headers: authHeaders() });
    const meData = await meRes.json();
    
    if (meData.student) {
      const student = meData.student;
      
      // Update welcome message
      const firstName = student.name.split(' ')[0];
      document.getElementById('studentWelcomeName').textContent = firstName;
      
      // Update profile info
      document.getElementById('studentProfileName').textContent = student.name;
      document.getElementById('studentProfileEmail').textContent = student.email;
      document.getElementById('studentProfileEnrolled').textContent = student.enrolledOn || '-';
      document.getElementById('studentProfileYear').textContent = student.year || student.cohort || '-';
      document.getElementById('studentProfileStatus').textContent = student.status || 'Active';
      
      // Set avatar with first letter
      const avatar = document.getElementById('studentAvatar');
      if (avatar) avatar.textContent = student.name.charAt(0).toUpperCase();
    }
    
    // Fetch attendance for stats
    const attRes = await fetch(`${API}/my/attendance`, { headers: authHeaders() });
    const attData = await attRes.json();
    
    const presentCount = attData.filter(a => a.status === 'present').length;
    const absentCount = attData.filter(a => a.status === 'absent').length;
    const lateCount = attData.filter(a => a.status === 'late').length;
    const totalAtt = attData.length;
    
    document.getElementById('studentPresentCount').textContent = presentCount;
    document.getElementById('studentAbsentCount').textContent = absentCount;
    document.getElementById('studentLateCount').textContent = lateCount;
    
    // Color code the stat cards
    const presentCard = document.getElementById('studentPresentCard');
    const absentCard = document.getElementById('studentAbsentCard');
    const lateCard = document.getElementById('studentLateCard');
    if (presentCard) presentCard.className = 'student-stat-card excellent';
    if (absentCard) absentCard.className = absentCount > 3 ? 'student-stat-card danger' : 'student-stat-card';
    if (lateCard) lateCard.className = lateCount > 2 ? 'student-stat-card warning' : 'student-stat-card';
    
    // Calculate attendance rate
    const attendanceRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 0;
    document.getElementById('studentAttendanceRate').textContent = `${attendanceRate}%`;
    
    const progressBar = document.getElementById('studentAttendanceBar');
    if (progressBar) {
      progressBar.style.width = `${attendanceRate}%`;
      progressBar.className = 'progress-bar ' + (attendanceRate >= 80 ? 'green' : attendanceRate >= 60 ? 'yellow' : 'red');
    }
    
    // Update tip based on attendance
    const tipEl = document.getElementById('studentTip');
    if (tipEl) {
      if (attendanceRate >= 90) {
        tipEl.textContent = "🌟 Excellent attendance! You're doing amazing!";
      } else if (attendanceRate >= 80) {
        tipEl.textContent = "👍 Good attendance! Keep it up!";
      } else if (attendanceRate >= 70) {
        tipEl.textContent = "⚠️ Your attendance could use some improvement. Try to attend more classes!";
      } else {
        tipEl.textContent = "📚 Your attendance needs attention. Regular attendance is key to success!";
      }
    }
    
    // Fetch activities for stats
    const actRes = await fetch(`${API}/my/activities`, { headers: authHeaders() });
    const actData = await actRes.json();
    
    document.getElementById('studentActivitiesCount').textContent = actData.length;
    
    // Activity breakdown
    const assignmentCount = actData.filter(a => a.type === 'assignment').length;
    const quizCount = actData.filter(a => a.type === 'quiz').length;
    const participationCount = actData.filter(a => a.type === 'participation').length;
    const otherCount = actData.filter(a => a.type === 'other').length;
    
    document.getElementById('studentAssignmentCount').textContent = assignmentCount;
    document.getElementById('studentQuizCount').textContent = quizCount;
    document.getElementById('studentParticipationCount').textContent = participationCount;
    document.getElementById('studentOtherCount').textContent = otherCount;
    
  } catch (err) {
    console.error('Failed to load student profile:', err);
  }
}
