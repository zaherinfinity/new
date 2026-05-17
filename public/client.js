async function apiCall(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ------------------ Login/Register page ------------------
if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginError = document.getElementById('loginError');
  const regError = document.getElementById('regError');
  const regSuccess = document.getElementById('regSuccess');

  fetch('/api/user/me', { credentials: 'include' })
    .then(res => { if (res.ok) window.location.href = '/dashboard.html'; })
    .catch(() => {});

  loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    loginError.textContent = '';
  });

  registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
    regError.textContent = '';
    regSuccess.textContent = '';
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
      await apiCall('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      window.location.href = '/dashboard.html';
    } catch (err) {
      loginError.textContent = err.message;
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    regError.textContent = '';
    regSuccess.textContent = '';
    try {
      await apiCall('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
      regSuccess.textContent = 'Registration successful! Please login.';
      registerForm.reset();
      setTimeout(() => loginTab.click(), 2000);
    } catch (err) {
      regError.textContent = err.message;
    }
  });
}

// ------------------ Dashboard page ------------------
if (window.location.pathname === '/dashboard.html') {
  let currentUser = null;

  fetch('/api/user/me', { credentials: 'include' })
    .then(res => {
      if (!res.ok) throw new Error('Not authenticated');
      return res.json();
    })
    .then(user => {
      currentUser = user;
      document.getElementById('userEmail').textContent = user.email;
      loadNotes();
    })
    .catch(() => window.location.href = '/');

  async function loadNotes() {
    try {
      const notes = await apiCall('/api/notes', { credentials: 'include' });
      const notesList = document.getElementById('notesList');
      if (notes.length === 0) {
        notesList.innerHTML = '<p>✨ No notes yet. Write your first note above!</p>';
        return;
      }
      notesList.innerHTML = notes.map(note => `
        <div class="note-item">
          <div class="note-content">${escapeHtml(note.content)}</div>
          <div class="note-date">${new Date(note.created_at).toLocaleString()}</div>
        </div>
      `).join('');
    } catch (err) {
      document.getElementById('notesList').innerHTML = `<p class="error-message">Failed to load notes: ${err.message}</p>`;
    }
  }

  document.getElementById('addNoteBtn').addEventListener('click', async () => {
    const content = document.getElementById('noteContent').value.trim();
    if (!content) return alert('Note cannot be empty');
    try {
      await apiCall('/api/notes', { method: 'POST', body: JSON.stringify({ content }), credentials: 'include' });
      document.getElementById('noteContent').value = '';
      loadNotes();
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await apiCall('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/';
  });

  function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }
}
