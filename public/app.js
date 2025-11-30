// Frontend logic for Student Record Web App
const API = '/api';
let token = localStorage.getItem('token') || null;

const loginView = document.getElementById('loginView');
const appView = document.getElementById('appView');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const sessionUser = document.getElementById('sessionUser');

loginBtn.addEventListener('click', async () => {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value.trim();
  loginError.classList.add('hidden');
  try {
    const res = await fetch(`${API}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    token = data.token;
    localStorage.setItem('token', token);
    sessionUser.textContent = username;
    showApp();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', () => {
  token = null; localStorage.removeItem('token'); hideApp();
});

function authHeaders() { return token ? { 'Authorization': `Bearer ${token}` } : {}; }

function showApp() { loginView.classList.add('hidden'); appView.classList.remove('hidden'); refreshAll(); }
function hideApp() { appView.classList.add('hidden'); loginView.classList.remove('hidden'); }

if (token) { sessionUser.textContent = 'admin'; showApp(); }

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
const actStudent = document.getElementById('actStudent');
const actType = document.getElementById('actType');
const actDesc = document.getElementById('actDesc');
const addActivityBtn = document.getElementById('addActivityBtn');
const actMsg = document.getElementById('actMsg');
const activitiesTableBody = document.querySelector('#activitiesTable tbody');

addActivityBtn.addEventListener('click', async () => {
  actMsg.classList.add('hidden');
  try {
    const body = { studentId: actStudent.value, type: actType.value, description: actDesc.value };
    const res = await fetch(`${API}/activities`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    actDesc.value='';
    refreshActivities(); refreshCounts();
  } catch (err) { actMsg.textContent = err.message; actMsg.classList.remove('hidden'); }
});

async function refreshStudents() {
  const res = await fetch(`${API}/students`, { headers: authHeaders() });
  const data = await res.json();
  studentsTableBody.innerHTML = data.map(s => `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.email)}</td><td>${escapeHtml(s.year ?? s.cohort ?? '')}</td><td>${s.status}</td><td>${s.enrolledOn}</td></tr>`).join('');
  return data;
}

async function refreshAttendance() {
  const res = await fetch(`${API}/attendance`, { headers: authHeaders() });
  const data = await res.json();
  attendanceTableBody.innerHTML = data.slice(-25).reverse().map(a => `<tr><td>${a.date}</td><td>${lookupName(a.studentId)}</td><td>${a.status}</td><td>${escapeHtml(a.note||'')}</td></tr>`).join('');
  return data;
}

async function refreshActivities() {
  const res = await fetch(`${API}/activities`, { headers: authHeaders() });
  const data = await res.json();
  activitiesTableBody.innerHTML = data.slice(-25).reverse().map(a => `<tr><td>${a.timestamp}</td><td>${lookupName(a.studentId)}</td><td>${a.type}</td><td>${escapeHtml(a.description)}</td></tr>`).join('');
  return data;
}

function populateStudentSelects() {
  const selects = [attStudent, actStudent];
  const options = studentsCache.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  selects.forEach(sel => sel.innerHTML = options);
}

let studentsCache = [];
function lookupName(id) { const s = studentsCache.find(x => x.id === id); return s ? s.name : id; }

async function refreshCounts() {
  document.getElementById('studentsCount').textContent = `Students: ${studentsCache.length}`;
  const attRes = await fetch(`${API}/attendance`, { headers: authHeaders() });
  const attData = await attRes.json();
  document.getElementById('attendanceCount').textContent = `Attendance: ${attData.length}`;
  const actRes = await fetch(`${API}/activities`, { headers: authHeaders() });
  const actData = await actRes.json();
  document.getElementById('activitiesCount').textContent = `Activities: ${actData.length}`;
}

async function refreshAll() {
  studentsCache = await refreshStudents();
  populateStudentSelects();
  await refreshAttendance();
  await refreshActivities();
  await refreshCounts();
}

function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c])); }
