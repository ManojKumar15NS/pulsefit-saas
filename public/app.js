document.addEventListener('DOMContentLoaded', () => {
  // --- 1. GLOBAL STATE & THEME INITIALIZATION ---
  let allClients = [];
  let currentWeekOffset = 0; // Offset in weeks from current week
  let selectedMobileDay = new Date().getDay() === 0 ? 7 : new Date().getDay(); // Default 1-7 Mon-Sun
  let weightChart = null;
  let fatChart = null;
  let goalChart = null;
  let progressLogsCache = [];
  let currentChartFilter = 'monthly'; // weekly, monthly, all

  // Custom Confirmation Modal yes-action callback
  let currentConfirmCallback = null;

  // Theme Switches
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeToggleBtnMobile = document.getElementById('themeToggleBtnMobile');

  function setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      updateThemeButtons(true);
    } else {
      document.documentElement.classList.remove('dark-theme');
      updateThemeButtons(false);
    }
    localStorage.setItem('theme', theme);
  }

  function updateThemeButtons(isDark) {
    const iconHTML = isDark ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
    const textVal = isDark ? 'Light Mode' : 'Dark Mode';

    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = `${iconHTML} <span>${textVal}</span>`;
    }
    if (themeToggleBtnMobile) {
      themeToggleBtnMobile.innerHTML = iconHTML;
    }
    lucide.createIcons();
  }

  // Initialize theme from localStorage
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);

  // Bind theme toggle clicks
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark-theme');
      setTheme(isDark ? 'light' : 'dark');
    });
  }
  if (themeToggleBtnMobile) {
    themeToggleBtnMobile.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark-theme');
      setTheme(isDark ? 'light' : 'dark');
    });
  }

  // Custom Toast Notifications
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-alert' + (type !== 'success' ? ' ' + type : '');
    
    let iconName = 'check-circle';
    if (type === 'error') iconName = 'x-circle';
    else if (type === 'warning') iconName = 'alert-triangle';

    toast.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <i data-lucide="${iconName}" style="width:16px; height:16px;"></i>
        <span>${message}</span>
      </div>
      <button style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; font-size:16px; margin-left:12px;" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // General Custom Confirmation overlay Dialog
  window.customConfirm = (title, message, yesCallback) => {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').classList.add('active');
    currentConfirmCallback = yesCallback;
  };
  window.closeCustomConfirm = () => {
    document.getElementById('confirmModal').classList.remove('active');
    currentConfirmCallback = null;
  };
  
  const confirmYesBtn = document.getElementById('confirmYesBtn');
  if (confirmYesBtn) {
    confirmYesBtn.onclick = () => {
      if (currentConfirmCallback) currentConfirmCallback();
      closeCustomConfirm();
    };
  }

  // Catch Session Timeout (401 status)
  function handleAuthFailure(res) {
    if (res.status === 401) {
      showToast('Session expired. Redirecting to login...', 'error');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2500);
      return true;
    }
    return false;
  }

  // Logout Modal Handling
  window.openLogoutModal = () => {
    document.getElementById('logoutConfirmModal').classList.add('active');
  };
  window.closeLogoutModal = () => {
    document.getElementById('logoutConfirmModal').classList.remove('active');
  };
  
  const btnConfirmLogout = document.getElementById('btnConfirmLogout');
  if (btnConfirmLogout) {
    btnConfirmLogout.onclick = async () => {
      closeLogoutModal();
      const res = await fetch('/api/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/login.html';
      }
    };
  }

  // --- 2. ROUTING & TAB NAVIGATION ---
  const tabItems = document.querySelectorAll('.nav-item, .tabbar-item');
  const sections = document.querySelectorAll('.page-section');

  function switchTab(tabName) {
    sections.forEach(sec => sec.classList.remove('active'));
    tabItems.forEach(tab => tab.classList.remove('active'));

    const targetSection = document.getElementById(tabName);
    if (targetSection) targetSection.classList.add('active');

    tabItems.forEach(tab => {
      if (tab.getAttribute('data-tab') === tabName) {
        tab.classList.add('active');
      }
    });

    if (tabName === 'dashboard') {
      loadDashboardData();
    } else if (tabName === 'clients') {
      loadClientsData();
    } else if (tabName === 'progress') {
      loadProgressDropdowns();
    } else if (tabName === 'calendar') {
      loadCalendarData();
    } else if (tabName === 'messages') {
      loadMessagesData();
    }
  }

  tabItems.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(tab.getAttribute('data-tab'));
    });
  });

  // Wire Mobile Day Selector buttons
  document.querySelectorAll('.mobile-day-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const btnTarget = e.currentTarget;
      selectedMobileDay = parseInt(btnTarget.getAttribute('data-day'));
      document.querySelectorAll('.mobile-day-btn').forEach(b => b.classList.remove('active'));
      btnTarget.classList.add('active');
      renderMobileCalendarList();
    });
  });

  // --- 3. AUTO BMI CALCULATORS ---
  const clientHeightInput = document.getElementById('clientHeight');
  const clientWeightInput = document.getElementById('clientWeight');
  const clientBmiInput = document.getElementById('clientBmi');

  function calculateBmi() {
    const height = parseFloat(clientHeightInput.value) / 100;
    const weight = parseFloat(clientWeightInput.value);
    if (height > 0 && weight > 0) {
      clientBmiInput.value = (weight / (height * height)).toFixed(1);
    } else {
      clientBmiInput.value = '';
    }
  }
  if (clientHeightInput && clientWeightInput) {
    clientHeightInput.addEventListener('input', calculateBmi);
    clientWeightInput.addEventListener('input', calculateBmi);
  }

  // --- 4. DASHBOARD CONTROLLER (SMART ALERTS & WELCOME PILLS) ---
  async function loadDashboardData() {
    try {
      const res = await fetch('/api/dashboard-stats');
      if (handleAuthFailure(res)) return;
      const data = await res.json();

      document.getElementById('statTotalClients').textContent = data.stats.total;
      document.getElementById('statActiveClients').textContent = data.stats.active;
      document.getElementById('statWeightLossTrends').textContent = data.stats.weightLossCount;
      document.getElementById('statInactiveAlertsCount').textContent = data.inactiveAlerts.length;

      // Smart Inactive Alerts List
      const alertsContainer = document.getElementById('inactiveAlertsList');
      if (data.inactiveAlerts.length === 0) {
        alertsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">All clients active and logging!</p>';
      } else {
        alertsContainer.innerHTML = data.inactiveAlerts.map(c => `
          <div class="alert-item" onclick="viewClientProfile(${c.id})">
            <div class="alert-meta">
              <h4>${c.name}</h4>
              <p>Last Activity: <strong style="color:var(--danger);">${c.last_interaction || 'Never'}</strong></p>
            </div>
            <span class="alert-badge" style="background:rgba(239, 68, 68, 0.1); color:var(--danger); border:1px solid rgba(239, 68, 68, 0.2);">${c.days_inactive} Days</span>
          </div>
        `).join('');
      }

      // Today's Date header display
      const today = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = days[today.getDay()];
      const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      document.getElementById('dashboardTodayDate').textContent = todayName + ', ' + dateStr;

      // Fetch sessions to filter for today
      const sessionsRes = await fetch('/api/schedule');
      const sessions = await sessionsRes.json();

      const todayDayOfWeek = today.getDay();
      const dayIndex = todayDayOfWeek === 0 ? 7 : todayDayOfWeek; // 1=Mon, 7=Sun
      
      const todaySessions = sessions.filter(s => s.day_of_week == dayIndex)
                                    .sort((a, b) => a.session_time.localeCompare(b.session_time));

      const sessionsTableBody = document.getElementById('dashboardTodaySessionsTableBody');
      if (todaySessions.length === 0) {
        sessionsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px 0; font-size:13px;">No sessions scheduled for today.</td></tr>';
      } else {
        sessionsTableBody.innerHTML = todaySessions.map(s => {
          const hour = parseInt(s.session_time.split(':')[0]);
          const mins = s.session_time.split(':')[1];
          const ampm = hour < 12 ? 'AM' : 'PM';
          let displayHour = hour % 12;
          if (displayHour === 0) displayHour = 12;
          const time12h = displayHour + ':' + mins + ' ' + ampm;

          return `
            <tr style="border-bottom:1px solid var(--border-color); font-size:13px; cursor:pointer;" onclick="switchTab('calendar')">
              <td style="padding:12px 8px; font-weight:600; color:var(--text-primary);">${s.client_name}</td>
              <td style="padding:12px 8px; color:var(--primary); font-weight:500;">${time12h}</td>
              <td style="padding:12px 8px; color:var(--text-secondary);">${s.notes || 'Workout Session'}</td>
              <td style="padding:12px 8px; text-align:right;">
                <span class="badge" style="background:var(--primary-glow); color:var(--primary); border:1px solid rgba(76,175,80,0.15); font-size:9px; padding:2px 6px; border-radius:4px;">Scheduled</span>
              </td>
            </tr>
          `;
        }).join('');
      }

      // Populate welcome metric pills (Fit Planner mockup style)
      document.getElementById('welcomeActiveCount').textContent = data.stats.active;
      document.getElementById('welcomeGoalsCount').textContent = data.goals.weightLoss + data.goals.weightGain + data.goals.muscleGain + data.goals.maintenance;
      document.getElementById('welcomeSessionsCount').textContent = todaySessions.length;

      // Goal Distribution Chart
      const ctx = document.getElementById('goalDistributionChart').getContext('2d');
      if (goalChart) goalChart.destroy();
      goalChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Weight Loss', 'Weight Gain', 'Muscle Gain', 'Maintenance'],
          datasets: [{
            data: [
              data.goals.weightLoss,
              data.goals.weightGain,
              data.goals.muscleGain,
              data.goals.maintenance
            ],
            backgroundColor: ['#4CAF50', '#81c784', '#9c27b0', '#ff9800'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: document.documentElement.classList.contains('dark-theme') ? '#ffffff' : '#1e293b', font: { family: 'Inter', size: 11 } }
            }
          }
        }
      });

      lucide.createIcons();
    } catch (err) {
      console.error(err);
    }
  }

  // --- 5. DASHBOARD DETAILS POPUP CONTROLLER ---
  window.viewSessionDetails = (sessionObj, statusClass) => {
    document.getElementById('sessDetClientName').textContent = sessionObj.client_name;
    
    const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    document.getElementById('sessDetDay').textContent = days[sessionObj.day_of_week] || 'Monday';
    
    // Format Time to 12h
    const hour = parseInt(sessionObj.session_time.split(':')[0]);
    const mins = sessionObj.session_time.split(':')[1];
    const ampm = hour < 12 ? 'AM' : 'PM';
    let displayHour = hour % 12;
    if (displayHour === 0) displayHour = 12;
    const time12h = displayHour + ':' + mins + ' ' + ampm;
    document.getElementById('sessDetTime').textContent = time12h;
    
    document.getElementById('sessDetNotes').textContent = sessionObj.notes || 'Workout Session (No notes)';
    
    const statusBadge = document.getElementById('sessDetStatusBadge');
    let labelText = 'Upcoming';
    if (statusClass === 'status-completed') labelText = 'Completed';
    else if (statusClass === 'status-missed') labelText = 'Missed / Special';
    statusBadge.textContent = labelText;
    statusBadge.className = `badge ${statusClass}`;

    document.getElementById('btnCancelSessionAction').onclick = () => {
      closeSessionDetailModal();
      executeCancelSession(sessionObj.id);
    };

    document.getElementById('sessionDetailModal').classList.add('active');
    lucide.createIcons();
  };

  window.closeSessionDetailModal = () => {
    document.getElementById('sessionDetailModal').classList.remove('active');
  };

  // --- 6. CLIENTS DIRECTORY CONTROLLER (DEBOUNCED SEARCH & PROGRESS SKELETON) ---
  const clientSearch = document.getElementById('clientSearch');
  const filterGoal = document.getElementById('filterGoal');
  const filterStatus = document.getElementById('filterStatus');
  const clientList = document.getElementById('clientList');
  const clientListSkeleton = document.getElementById('clientListSkeleton');

  async function loadClientsData() {
    try {
      clientList.style.display = 'none';
      clientListSkeleton.style.display = 'grid';

      const res = await fetch('/api/clients');
      if (handleAuthFailure(res)) return;
      allClients = await res.json();

      setTimeout(() => {
        clientListSkeleton.style.display = 'none';
        clientList.style.display = 'grid';
        renderClientsList();
      }, 300); // Shimmer Skeleton Loader Delay
    } catch (err) {
      console.error(err);
    }
  }

  function renderClientsList() {
    const query = clientSearch.value.toLowerCase();
    const goal = filterGoal.value;
    const status = filterStatus.value;

    const filtered = allClients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(query) ||
                            c.email.toLowerCase().includes(query) ||
                            c.phone.toLowerCase().includes(query);
      const matchesGoal = (goal === 'All') || (c.fitness_goal === goal);
      const matchesStatus = (status === 'All') || (c.status === status);

      return matchesSearch && matchesGoal && matchesStatus;
    });

    if (filtered.length === 0) {
      clientList.innerHTML = '<p class="card" style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">No clients found matching the filters.</p>';
      return;
    }

    clientList.innerHTML = filtered.map(c => {
      const progressPct = c.fitness_goal === 'Weight Loss' ? 70 : (c.fitness_goal === 'Muscle Gain' ? 55 : 45);
      return `
        <div class="client-list-item" onclick="viewClientProfile(${c.id})">
          <div class="client-item-meta">
            <div class="client-avatar">${c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</div>
            <div class="client-details-summary">
              <h3>${c.name}</h3>
              <p>${c.email} &bull; ${c.age} yrs</p>
            </div>
          </div>
          
          <!-- Premium Progress Tracker -->
          <div style="margin-top: 2px;">
            <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-secondary); margin-bottom:4px;">
              <span>Target Achieved</span>
              <span>${progressPct}%</span>
            </div>
            <div style="width:100%; height:6px; background:rgba(120,120,120,0.08); border-radius:3px; overflow:hidden;">
              <div style="width:${progressPct}%; height:100%; background:linear-gradient(90deg, var(--primary), #81c784); border-radius:3px;"></div>
            </div>
          </div>

          <div class="client-list-item-footer">
            <div class="client-badges">
              <span class="badge badge-goal">${c.fitness_goal}</span>
              <span class="badge badge-${c.status}">${c.status}</span>
            </div>
            <div class="client-list-item-footer-actions">
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); viewClientProfile(${c.id})" title="Profile"><i data-lucide="eye" style="width:12px; height:12px;"></i></button>
              <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.openQuickProgress(${c.id}, '${c.name}')" title="Log Progress"><i data-lucide="plus" style="width:12px; height:12px;"></i></button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons();
  }

  // Debounced input search
  let searchTimeout = null;
  if (clientSearch) {
    clientSearch.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(renderClientsList, 250); // 250ms debounce
    });
  }
  if (filterGoal) filterGoal.addEventListener('change', renderClientsList);
  if (filterStatus) filterStatus.addEventListener('change', renderClientsList);

  // --- 7. ADD & EDIT CLIENT FORMS ---
  const clientFormModal = document.getElementById('clientFormModal');
  const clientForm = document.getElementById('clientForm');

  window.openAddClientModal = () => {
    document.getElementById('clientModalTitle').textContent = 'Add New Client';
    document.getElementById('formClientId').value = '';
    clientForm.reset();
    document.getElementById('clientJoinDate').value = new Date().toISOString().split('T')[0];
    clientFormModal.classList.add('active');
  };

  window.closeClientFormModal = () => {
    clientFormModal.classList.remove('active');
  };

  clientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = document.getElementById('formClientId').value;
    const clientData = {
      name: document.getElementById('clientName').value,
      age: parseInt(document.getElementById('clientAge').value),
      gender: document.getElementById('clientGender').value,
      fitness_goal: document.getElementById('clientGoal').value,
      height: parseFloat(document.getElementById('clientHeight').value),
      weight: parseFloat(document.getElementById('clientWeight').value),
      body_fat: parseFloat(document.getElementById('clientBodyFat').value),
      phone: document.getElementById('clientPhone').value,
      email: document.getElementById('clientEmail').value,
      join_date: document.getElementById('clientJoinDate').value,
      status: document.getElementById('clientStatus').value,
      medical_conditions: document.getElementById('clientMedical').value
    };

    const isEdit = !!clientId;
    const url = isEdit ? '/api/clients/' + clientId : '/api/clients';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });

      if (response.ok) {
        const result = await response.json();
        const savedClientId = isEdit ? clientId : result.id;

        const fileInput = document.getElementById('clientReportFile');
        if (fileInput && fileInput.files.length > 0) {
          const formData = new FormData();
          formData.append('report', fileInput.files[0]);
          await fetch('/api/clients/' + savedClientId + '/reports', {
            method: 'POST',
            body: formData
          });
        }

        closeClientFormModal();
        showToast(isEdit ? 'Client updated successfully!' : 'New client added successfully!');
        loadClientsData();
        loadDashboardData();
        if (isEdit) {
          closeClientDetailModal();
        }
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to save client info.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  });

  // --- 8. CLIENT PROFILE CONTROLLER (CUSTOM CONFIRMS) ---
  const clientDetailModal = document.getElementById('clientDetailModal');
  let activeProfileClientId = null;

  window.viewClientProfile = async (clientId) => {
    activeProfileClientId = clientId;
    try {
      const res = await fetch('/api/clients/' + clientId);
      if (handleAuthFailure(res)) return;
      const client = await res.json();

      document.getElementById('detName').textContent = client.name;
      document.getElementById('detAvatar').textContent = client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      
      const goalEl = document.getElementById('detGoalBadge');
      goalEl.textContent = client.fitness_goal;
      
      const statusEl = document.getElementById('detStatusBadge');
      statusEl.textContent = client.status;
      statusEl.className = 'badge badge-' + client.status;

      document.getElementById('detAge').textContent = client.age;
      document.getElementById('detGender').textContent = client.gender;
      document.getElementById('detHeight').textContent = client.height + ' cm';
      document.getElementById('detWeight').textContent = client.weight + ' kg';
      document.getElementById('detBodyFat').textContent = client.body_fat + '%';
      document.getElementById('detBmi').textContent = client.bmi;
      document.getElementById('detPhone').textContent = client.phone;
      document.getElementById('detEmail').textContent = client.email;
      document.getElementById('detJoinDate').textContent = client.join_date;
      document.getElementById('detMedical').textContent = client.medical_conditions || 'No conditions logged.';

      document.getElementById('btnEditClientDetails').onclick = () => openEditClientModal(client);
      document.getElementById('btnDeleteClient').onclick = () => {
        customConfirm(
          'Delete Client?',
          `Are you sure you want to permanently delete client ${client.name}? All physical logs and scheduled workouts will be lost.`,
          () => executeDeleteClient(client.id)
        );
      };

      loadProfileReportsTab(clientId);
      loadProfileSessionsTab(clientId);
      switchProfileTab('medical');

      clientDetailModal.classList.add('active');
    } catch (err) {
      console.error(err);
    }
  };

  window.closeClientDetailModal = () => {
    clientDetailModal.classList.remove('active');
  };

  // Profile Tab Switching
  const profileTabButtons = document.querySelectorAll('.client-tab-btn');
  const profileTabPanes = document.querySelectorAll('.tab-pane');

  function switchProfileTab(tabName) {
    profileTabButtons.forEach(btn => btn.classList.remove('active'));
    profileTabPanes.forEach(pane => pane.classList.remove('active'));

    const tabBtn = document.querySelector(`[data-profile-tab="${tabName}"]`);
    if (tabBtn) tabBtn.classList.add('active');
    
    if (tabName === 'medical') {
      document.getElementById('profTabMedical').classList.add('active');
    } else if (tabName === 'reports') {
      document.getElementById('profTabReports').classList.add('active');
    } else if (tabName === 'sessions') {
      document.getElementById('profTabSessions').classList.add('active');
    }
  }

  profileTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchProfileTab(btn.getAttribute('data-profile-tab'));
    });
  });

  async function executeDeleteClient(clientId) {
    const res = await fetch('/api/clients/' + clientId, { method: 'DELETE' });
    if (res.ok) {
      showToast('Client deleted successfully.');
      closeClientDetailModal();
      loadClientsData();
      loadDashboardData();
    } else {
      showToast('Failed to delete client.', 'error');
    }
  }

  function openEditClientModal(client) {
    document.getElementById('clientModalTitle').textContent = 'Edit Client Profile';
    document.getElementById('formClientId').value = client.id;
    document.getElementById('clientName').value = client.name;
    document.getElementById('clientAge').value = client.age;
    document.getElementById('clientGender').value = client.gender;
    document.getElementById('clientGoal').value = client.fitness_goal;
    document.getElementById('clientHeight').value = client.height;
    document.getElementById('clientWeight').value = client.weight;
    document.getElementById('clientBodyFat').value = client.body_fat;
    document.getElementById('clientPhone').value = client.phone;
    document.getElementById('clientEmail').value = client.email;
    document.getElementById('clientJoinDate').value = client.join_date;
    document.getElementById('clientStatus').value = client.status;
    document.getElementById('clientMedical').value = client.medical_conditions;
    document.getElementById('clientReportFile').value = '';

    clientFormModal.classList.add('active');
  }

  // Documents Reports list
  const reportFileInput = document.getElementById('reportFileInput');
  const reportUploadZone = document.getElementById('reportUploadZone');

  if (reportUploadZone && reportFileInput) {
    reportUploadZone.addEventListener('click', () => reportFileInput.click());
    reportFileInput.addEventListener('change', async () => {
      if (reportFileInput.files.length === 0) return;

      const formData = new FormData();
      formData.append('report', reportFileInput.files[0]);

      const res = await fetch('/api/clients/' + activeProfileClientId + '/reports', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        reportFileInput.value = '';
        showToast('Document uploaded successfully.');
        loadProfileReportsTab(activeProfileClientId);
      } else {
        showToast('File upload failed.', 'error');
      }
    });
  }

  async function loadProfileReportsTab(clientId) {
    const list = document.getElementById('reportsList');
    try {
      const res = await fetch('/api/clients/' + clientId + '/reports');
      const reports = await res.json();

      if (reports.length === 0) {
        list.innerHTML = '<p style="font-size:13px; color:var(--text-muted); text-align:center; padding: 20px 0;">No uploads present.</p>';
        return;
      }

      list.innerHTML = reports.map(r => `
        <div class="history-log-item">
          <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 70%;">
            <a href="${r.file_path}" target="_blank" style="color: var(--primary); font-size:13px; font-weight: 500; text-decoration:none;">${r.file_name}</a>
            <span style="display:block; font-size:10px; color: var(--text-secondary); margin-top:2px;">Uploaded: ${r.upload_date}</span>
          </div>
          <button class="btn btn-danger btn-sm" onclick="executeDeleteReport(${r.id})" style="padding: 4px 8px;">Delete</button>
        </div>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  }

  window.executeDeleteReport = async (reportId) => {
    customConfirm(
      'Delete Document?',
      'Are you sure you want to delete this document?',
      async () => {
        const res = await fetch('/api/reports/' + reportId, { method: 'DELETE' });
        if (res.ok) {
          showToast('Document deleted.');
          loadProfileReportsTab(activeProfileClientId);
        }
      }
    );
  };

  async function loadProfileSessionsTab(clientId) {
    const container = document.getElementById('clientSessionsList');
    try {
      const res = await fetch('/api/clients/' + clientId + '/sessions');
      const clientSessions = await res.json();

      if (clientSessions.length === 0) {
        container.innerHTML = '<p style="font-size:13px; color:var(--text-muted); text-align:center; padding: 20px 0;">No recurring training sessions booked.</p>';
        return;
      }

      container.innerHTML = clientSessions.map(s => {
        const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const dayName = days[s.day_of_week] || 'Monday';
        return `
          <div class="history-log-item">
            <div>
              <strong style="color:var(--primary); font-size:13px;">${dayName}s at ${s.session_time}</strong>
              <span style="display:block; font-size:11.5px; color:var(--text-secondary); margin-top:2px;">Target: ${s.notes || 'General Training'}</span>
            </div>
            <button class="btn btn-danger btn-sm" onclick="executeCancelProfileSession(${s.id})" style="padding:4px 8px;">Cancel</button>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error(err);
    }
  }

  window.executeCancelProfileSession = async (sessionId) => {
    customConfirm(
      'Cancel Workout?',
      'Cancel this recurring training session from the schedule?',
      async () => {
        const res = await fetch('/api/schedule/' + sessionId, { method: 'DELETE' });
        if (res.ok) {
          showToast('Session cancelled.');
          loadProfileSessionsTab(activeProfileClientId);
          loadCalendarData();
          loadDashboardData();
        }
      }
    );
  };

  // --- 9. PROGRESS LOGS & TOGGLE CONTROLS (LINE GRADIENTS & BAR CHARTS) ---
  const progressClientSelect = document.getElementById('progressClientSelect');
  const progressDataContainer = document.getElementById('progressDataContainer');
  const progressEmptyState = document.getElementById('progressEmptyState');
  const btnLogProgress = document.getElementById('btnLogProgress');

  const toggleWeekly = document.getElementById('toggleWeekly');
  const toggleMonthly = document.getElementById('toggleMonthly');
  const toggleAllTime = document.getElementById('toggleAllTime');

  async function loadProgressDropdowns() {
    try {
      const res = await fetch('/api/clients');
      if (handleAuthFailure(res)) return;
      const clients = await res.json();

      progressClientSelect.innerHTML = '<option value="">-- Choose a Client --</option>' + 
        clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

      progressDataContainer.style.display = 'none';
      progressEmptyState.style.display = 'block';
      btnLogProgress.style.display = 'none';
    } catch (err) {
      console.error(err);
    }
  }

  if (progressClientSelect) {
    progressClientSelect.addEventListener('change', () => {
      const val = progressClientSelect.value;
      if (val) {
        progressDataContainer.style.display = 'block';
        progressEmptyState.style.display = 'none';
        btnLogProgress.style.display = 'inline-flex';
        loadClientProgressData(val);
      } else {
        progressDataContainer.style.display = 'none';
        progressEmptyState.style.display = 'block';
        btnLogProgress.style.display = 'none';
      }
    });
  }

  // Toggles bindings
  function setChartFilterActive(btn) {
    [toggleWeekly, toggleMonthly, toggleAllTime].forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  if (toggleWeekly) {
    toggleWeekly.addEventListener('click', () => {
      currentChartFilter = 'weekly';
      setChartFilterActive(toggleWeekly);
      renderChartsAndLogs(progressLogsCache);
    });
  }
  if (toggleMonthly) {
    toggleMonthly.addEventListener('click', () => {
      currentChartFilter = 'monthly';
      setChartFilterActive(toggleMonthly);
      renderChartsAndLogs(progressLogsCache);
    });
  }
  if (toggleAllTime) {
    toggleAllTime.addEventListener('click', () => {
      currentChartFilter = 'all';
      setChartFilterActive(toggleAllTime);
      renderChartsAndLogs(progressLogsCache);
    });
  }

  async function loadClientProgressData(clientId) {
    try {
      const res = await fetch('/api/clients/' + clientId + '/progress');
      if (handleAuthFailure(res)) return;
      progressLogsCache = await res.json();
      renderChartsAndLogs(progressLogsCache);
    } catch (err) {
      console.error(err);
    }
  }

  function renderChartsAndLogs(logs) {
    let filteredLogs = [...logs];
    const now = new Date();
    
    if (currentChartFilter === 'weekly') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredLogs = logs.filter(l => new Date(l.date) >= sevenDaysAgo);
    } else if (currentChartFilter === 'monthly') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredLogs = logs.filter(l => new Date(l.date) >= thirtyDaysAgo);
    }

    const list = document.getElementById('progressLogsList');
    if (filteredLogs.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted); font-size:13px; text-align:center; padding:20px 0;">No progress entries logged in this range.</p>';
    } else {
      list.innerHTML = filteredLogs.map(l => `
        <div class="history-log-item">
          <div class="log-metrics-brief">
            <div class="brief-metric"><span>Date</span><span>${l.date}</span></div>
            <div class="brief-metric"><span>Weight</span><span>${l.weight} kg</span></div>
            <div class="brief-metric"><span>Body Fat</span><span>${l.body_fat}%</span></div>
            <div class="brief-metric"><span>BMI</span><span>${l.bmi}</span></div>
          </div>
          <div style="flex-grow:1; padding-left: 20px; font-size:12px; color:var(--text-secondary); max-width:40%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${l.notes || ''}
          </div>
          <div class="log-actions">
            <button class="btn btn-danger btn-sm" onclick="executeDeleteProgressLog(${l.id})" style="padding: 4px 8px;">Delete</button>
          </div>
        </div>
      `).join('');
    }

    const dates = filteredLogs.map(l => l.date).reverse();
    const weights = filteredLogs.map(l => l.weight).reverse();
    const fats = filteredLogs.map(l => l.body_fat).reverse();

    // Line Chart with Glowing gradient fill
    const wCtx = document.getElementById('weightHistoryChart').getContext('2d');
    if (weightChart) weightChart.destroy();

    const weightGradient = wCtx.createLinearGradient(0, 0, 0, 300);
    weightGradient.addColorStop(0, 'rgba(76, 175, 80, 0.25)');
    weightGradient.addColorStop(1, 'rgba(76, 175, 80, 0)');

    weightChart = new Chart(wCtx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Weight (kg)',
          data: weights,
          borderColor: '#4CAF50',
          backgroundColor: weightGradient,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: 'rgba(120,120,120,0.05)' }, ticks: { color: document.documentElement.classList.contains('dark-theme') ? '#a0aec0' : '#64748b' } },
          y: { grid: { color: 'rgba(120,120,120,0.05)' }, ticks: { color: document.documentElement.classList.contains('dark-theme') ? '#a0aec0' : '#64748b' } }
        }
      }
    });

    // Bar Chart for Body Fat
    const fCtx = document.getElementById('fatHistoryChart').getContext('2d');
    if (fatChart) fatChart.destroy();
    
    fatChart = new Chart(fCtx, {
      type: 'bar',
      data: {
        labels: dates,
        datasets: [{
          label: 'Body Fat (%)',
          data: fats,
          backgroundColor: 'rgba(255, 176, 0, 0.2)',
          borderColor: '#ff9800',
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: 'rgba(120,120,120,0.05)' }, ticks: { color: document.documentElement.classList.contains('dark-theme') ? '#a0aec0' : '#64748b' } },
          y: { grid: { color: 'rgba(120,120,120,0.05)' }, ticks: { color: document.documentElement.classList.contains('dark-theme') ? '#a0aec0' : '#64748b' } }
        }
      }
    });

    lucide.createIcons();
  }

  window.executeDeleteProgressLog = async (logId) => {
    customConfirm(
      'Delete Log?',
      'Delete this metrics log entry permanently?',
      async () => {
        const res = await fetch('/api/progress/' + logId, { method: 'DELETE' });
        if (res.ok) {
          showToast('Progress entry deleted.');
          loadClientProgressData(progressClientSelect.value);
          loadDashboardData();
        }
      }
    );
  };

  // Add Progress log Modal submit
  const progressFormModal = document.getElementById('progressFormModal');
  const progressForm = document.getElementById('progressForm');

  window.openAddProgressModal = () => {
    progressForm.reset();
    document.getElementById('progDate').value = new Date().toISOString().split('T')[0];
    progressFormModal.classList.add('active');
  };

  window.closeProgressFormModal = () => {
    progressFormModal.classList.remove('active');
  };

  window.openQuickProgress = (clientId, clientName) => {
    progressClientSelect.value = clientId;
    progressClientSelect.dispatchEvent(new Event('change'));
    switchTab('progress');
    setTimeout(() => {
      openAddProgressModal();
    }, 200);
  };

  progressForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = progressClientSelect.value;
    const logData = {
      date: document.getElementById('progDate').value,
      weight: parseFloat(document.getElementById('progWeight').value),
      body_fat: parseFloat(document.getElementById('progBodyFat').value),
      notes: document.getElementById('progNotes').value
    };

    try {
      const res = await fetch('/api/clients/' + clientId + '/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });

      if (res.ok) {
        const fileInput = document.getElementById('progReportFile');
        if (fileInput && fileInput.files.length > 0) {
          const formData = new FormData();
          formData.append('report', fileInput.files[0]);
          await fetch('/api/clients/' + clientId + '/reports', {
            method: 'POST',
            body: formData
          });
        }

        closeProgressFormModal();
        showToast('Progress metric logged.');
        loadClientProgressData(clientId);
        loadDashboardData();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to save entry.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  });

  // --- 10. CALENDAR WEEKLY TIMETABLE (DOUBLE-BOOKING CHECKS) ---
  const modalSchedClient = document.getElementById('modalSchedClient');
  const timetableWeekRange = document.getElementById('timetableWeekRange');
  const timetableBody = document.getElementById('timetableBody');
  const scheduleModal = document.getElementById('scheduleModal');
  const modalScheduleForm = document.getElementById('modalScheduleForm');

  let calendarSessionsCache = [];

  function getMonday(d) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function getFormattedDateString(d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return yyyy + '-' + mm + '-' + dd;
  }

  document.getElementById('btnPrevWeek').addEventListener('click', () => {
    currentWeekOffset--;
    loadCalendarData();
  });
  document.getElementById('btnNextWeek').addEventListener('click', () => {
    currentWeekOffset++;
    loadCalendarData();
  });
  document.getElementById('btnCurrentWeek').addEventListener('click', () => {
    currentWeekOffset = 0;
    loadCalendarData();
  });

  window.openScheduleModal = () => {
    modalScheduleForm.reset();
    scheduleModal.classList.add('active');
  };

  window.closeScheduleModal = () => {
    scheduleModal.classList.remove('active');
  };

  // Schedule Save handler (Double Booking check)
  modalScheduleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sessionData = {
      client_id: modalSchedClient.value,
      day_of_week: parseInt(document.getElementById('modalSchedDay').value),
      session_time: document.getElementById('modalSchedTime').value,
      notes: document.getElementById('modalSchedNotes').value
    };

    // Client-side Double Booking Check
    const doubleBooked = calendarSessionsCache.some(existing => {
      return existing.day_of_week == sessionData.day_of_week && 
             existing.session_time === sessionData.session_time;
    });

    if (doubleBooked) {
      showToast('Double booking alert! Another workout is already scheduled at this slot.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });

      if (res.ok) {
        closeScheduleModal();
        showToast('Workout scheduled successfully!');
        loadCalendarData();
        loadDashboardData();
      } else {
        showToast('Failed to schedule session.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  });

  window.executeCancelSession = async (sessionId) => {
    customConfirm(
      'Cancel Workout?',
      'Remove this session from the schedule?',
      async () => {
        const res = await fetch('/api/schedule/' + sessionId, { method: 'DELETE' });
        if (res.ok) {
          showToast('Workout session cancelled.');
          loadCalendarData();
          loadDashboardData();
        }
      }
    );
  };

  async function loadCalendarData() {
    try {
      const clientsRes = await fetch('/api/clients');
      if (handleAuthFailure(clientsRes)) return;
      const clients = await clientsRes.json();
      modalSchedClient.innerHTML = '<option value="">-- Choose a Client --</option>' + 
        clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

      const sessionsRes = await fetch('/api/schedule');
      calendarSessionsCache = await sessionsRes.json();

      const today = new Date();
      const targetDate = new Date(today.setDate(today.getDate() + (currentWeekOffset * 7)));
      const monday = getMonday(targetDate);

      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDates.push(d);
      }

      const startStr = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const sunday = weekDates[6];
      const endStr = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      timetableWeekRange.textContent = startStr + ' - ' + endStr;

      const todayStr = getFormattedDateString(new Date());
      for (let i = 1; i <= 7; i++) {
        const d = weekDates[i - 1];
        const dStr = getFormattedDateString(d);
        
        const headerCell = document.querySelector(`th[data-day-col="${i}"]`);
        const subtext = document.getElementById('dateCol' + i);
        
        subtext.textContent = d.getDate() + '/' + (d.getMonth() + 1);

        // Populate mobile dates too!
        const mobSubtext = document.getElementById('mobDate' + i);
        if (mobSubtext) {
          mobSubtext.textContent = d.getDate() + '/' + (d.getMonth() + 1);
        }

        if (dStr === todayStr) {
          headerCell.classList.add('current-day');
        } else {
          headerCell.classList.remove('current-day');
        }
      }

      timetableBody.innerHTML = '';

      const startHour = 5;
      const endHour = 22;

      const todayDayOfWeek = new Date().getDay();
      const currentDayIndex = todayDayOfWeek === 0 ? 7 : todayDayOfWeek; // 1=Mon, 7=Sun
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();

      for (let hour = startHour; hour <= endHour; hour++) {
        const ampm = hour < 12 ? 'AM' : 'PM';
        let displayHour = hour % 12;
        if (displayHour === 0) displayHour = 12;
        const hourStr = displayHour + ':00 ' + ampm;

        const tr = document.createElement('tr');
        
        const tdTime = document.createElement('td');
        tdTime.className = 'time-cell';
        tdTime.textContent = hourStr;
        tr.appendChild(tdTime);

        for (let dayIndex = 1; dayIndex <= 7; dayIndex++) {
          const tdDay = document.createElement('td');
          tdDay.className = 'timetable-slot-cell';

          const colDateStr = getFormattedDateString(weekDates[dayIndex - 1]);
          if (colDateStr === todayStr) {
            tdDay.className += ' current-day';
          }

          const slotSessions = calendarSessionsCache.filter(s => {
            const sHour = parseInt(s.session_time.split(':')[0]);
            return s.day_of_week == dayIndex && sHour === hour;
          });

          slotSessions.forEach((s, idx) => {
            const card = document.createElement('div');
            const themeClass = idx % 2 === 1 ? ' sec-theme' : '';
            
            // Dynamic Time-Based Status Calculations (Calmendar style indicator)
            let statusClass = 'status-upcoming';
            if (s.day_of_week < currentDayIndex) {
              statusClass = 'status-completed';
            } else if (s.day_of_week == currentDayIndex) {
              const sHour = parseInt(s.session_time.split(':')[0]);
              const sMin = parseInt(s.session_time.split(':')[1]);
              if (sHour < currentHour || (sHour === currentHour && sMin <= currentMinute)) {
                statusClass = 'status-completed';
              } else {
                statusClass = 'status-upcoming';
              }
            }

            if (s.notes && (s.notes.toLowerCase().includes('missed') || s.notes.toLowerCase().includes('injury'))) {
              statusClass = 'status-missed';
            }

            const colorIndex = s.client_id % 6;
            card.className = `timetable-session-card card-theme-${colorIndex} ${statusClass}` + themeClass;
            
            // Render card with initials avatar tag
            const clientInitials = s.client_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            card.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:4px;">
                <div style="overflow:hidden;">
                  <h4>${s.client_name}</h4>
                  <p>${s.notes || 'Workout Session'}</p>
                </div>
                <div class="sess-client-initial" style="font-size:8px; font-weight:700; width:16px; height:16px; border-radius:50%; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; color:var(--text-primary); flex-shrink:0;">${clientInitials}</div>
              </div>
              <div class="session-time-subtext">${s.session_time}</div>
            `;
            
            card.addEventListener('click', (e) => {
              e.stopPropagation();
              viewSessionDetails(s, statusClass);
            });

            tdDay.appendChild(card);
          });

          tr.appendChild(tdDay);
        }

        timetableBody.appendChild(tr);
      }

      // Also render the mobile list
      renderMobileCalendarList();

      lucide.createIcons();
    } catch (err) {
      console.error(err);
    }
  }

  // Mobile Agenda View List Renderer
  function renderMobileCalendarList() {
    const mobileSessionsList = document.getElementById('mobileSessionsList');
    if (!mobileSessionsList) return;

    const daySessions = calendarSessionsCache.filter(s => s.day_of_week == selectedMobileDay)
      .sort((a, b) => a.session_time.localeCompare(b.session_time));

    const todayDayOfWeek = new Date().getDay();
    const currentDayIndex = todayDayOfWeek === 0 ? 7 : todayDayOfWeek;
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();

    if (daySessions.length === 0) {
      mobileSessionsList.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
          <i data-lucide="calendar-x" style="width:36px; height:36px; margin-bottom:10px; opacity:0.5;"></i>
          <p style="font-size:13.5px;">No sessions scheduled for this day.</p>
        </div>
      `;
      lucide.createIcons();
    } else {
      mobileSessionsList.innerHTML = daySessions.map(s => {
        const initials = s.client_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const colorIndex = s.client_id % 6;
        
        let statusClass = 'status-upcoming';
        if (s.day_of_week < currentDayIndex) {
          statusClass = 'status-completed';
        } else if (s.day_of_week == currentDayIndex) {
          const sHour = parseInt(s.session_time.split(':')[0]);
          const sMin = parseInt(s.session_time.split(':')[1]);
          if (sHour < currentHour || (sHour === currentHour && sMin <= currentMinute)) {
            statusClass = 'status-completed';
          }
        }
        if (s.notes && (s.notes.toLowerCase().includes('missed') || s.notes.toLowerCase().includes('injury'))) {
          statusClass = 'status-missed';
        }

        const hour = parseInt(s.session_time.split(':')[0]);
        const mins = s.session_time.split(':')[1];
        const ampm = hour < 12 ? 'AM' : 'PM';
        let displayHour = hour % 12;
        if (displayHour === 0) displayHour = 12;
        const time12h = displayHour + ':' + mins + ' ' + ampm;

        return `
          <div class="mobile-session-list-item card-theme-${colorIndex} ${statusClass}" onclick="event.stopPropagation(); viewSessionDetails(${JSON.stringify(s).replace(/"/g, '&quot;')}, '${statusClass}')">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="card-avatar-initials" style="background:rgba(255,255,255,0.25); color:#ffffff; font-weight:700; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px;">${initials}</div>
              <div>
                <h4 style="color:#ffffff; font-size:14px; font-weight:700; margin:0;">${s.client_name}</h4>
                <p style="color:rgba(255,255,255,0.85); font-size:11.5px; margin:4px 0 0 0;">${s.notes || 'Workout Session'}</p>
              </div>
            </div>
            <div style="text-align:right;">
              <span class="badge" style="background:rgba(255,255,255,0.2); color:#ffffff; font-size:11px; padding:3px 8px; border-radius:6px; font-weight:600;">${time12h}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // --- 11. MESSAGING SYSTEM (CHAT-STYLE BUBBLES WITH DOUBLE TICK INDICATORS) ---
  const msgClient = document.getElementById('msgClient');
  const msgBody = document.getElementById('msgBody');
  const msgTemplateType = document.getElementById('msgTemplateType');
  const messageLogsList = document.getElementById('messageLogsList');

  window.applyTemplate = (type) => {
    const clientSelected = msgClient.value;
    let clientName = '[Client Name]';
    
    if (clientSelected) {
      const client = allClients.find(c => c.id == clientSelected);
      if (client) clientName = client.name;
    }

    let text = '';
    if (type === 'Diet') {
      text = 'Hey ' + clientName + ', remember to hit your protein target and log meals today!';
    } else if (type === 'Workout') {
      text = 'Great effort lately! Make sure you do not skip your workout routine today. Let me know when you complete!';
    } else if (type === 'Session Reminder') {
      text = 'Hi ' + clientName + ', reminding you of our scheduled workout session tomorrow. See you at the gym!';
    } else if (type === 'Hydration') {
      text = 'Hydration Alert! Make sure you are drinking at least 3-4 liters of water today to keep your energy up.';
    }

    msgBody.value = text;
    msgTemplateType.value = type;
  };

  async function loadMessagesData() {
    try {
      const clientsRes = await fetch('/api/clients');
      if (handleAuthFailure(clientsRes)) return;
      allClients = await clientsRes.json();
      msgClient.innerHTML = '<option value="">-- Choose a Client --</option>' + 
        allClients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

      const logsRes = await fetch('/api/messages');
      const messages = await logsRes.json();

      if (messages.length === 0) {
        messageLogsList.innerHTML = '<p style="color:var(--text-muted); font-size:13px; text-align:center; padding:20px 0;">No sent logs in database.</p>';
      } else {
        messageLogsList.innerHTML = messages.map((m, idx) => {
          const isEven = idx % 2 === 0;
          const bubbleClass = isEven ? 'sent' : 'received';
          const timeFormatted = new Date(m.sent_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateFormatted = new Date(m.sent_date).toLocaleDateString([], { month: 'short', day: 'numeric' });
          
          return `
            <div class="chat-bubble ${bubbleClass}">
              <div style="font-size: 10px; font-weight: 700; color: var(--primary); margin-bottom: 2px;">
                ${isEven ? 'You' : m.client_name} &bull; ${m.template_type}
              </div>
              <div>${m.message_text}</div>
              <div class="chat-bubble-meta">
                <span>${dateFormatted}, ${timeFormatted}</span>
                <i data-lucide="check-check" class="msg-status-icon" style="width:12px; height:12px; display:inline-block;"></i>
              </div>
            </div>
          `;
        }).join('');
      }

      messageLogsList.scrollTop = messageLogsList.scrollHeight;

      lucide.createIcons();
    } catch (err) {
      console.error(err);
    }
  }

  document.getElementById('sendMessageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = msgClient.value;
    const msgText = msgBody.value;
    const tempType = msgTemplateType.value;

    const messageData = {
      client_id: clientId,
      message_text: msgText,
      template_type: tempType
    };

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      if (response.ok) {
        let client = allClients.find(c => c.id == clientId);
        if (!client) {
          const cRes = await fetch('/api/clients/' + clientId);
          client = await cRes.json();
        }

        const cleanPhone = client.phone.replace(/[^\d+]/g, '');
        const encodedText = encodeURIComponent(msgText);
        const waUrl = 'https://wa.me/' + cleanPhone + '?text=' + encodedText;

        window.open(waUrl, '_blank');

        document.getElementById('sendMessageForm').reset();
        msgTemplateType.value = 'Custom';
        showToast('Alert logged to message history!');
        loadMessagesData();
      } else {
        showToast('Failed to log message history.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  });

  async function loadTrainerProfile() {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const trainer = await res.json();
        document.getElementById('welcomeTrainerName').textContent = 'Hi, ' + trainer.fullname;
        const initials = trainer.fullname.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const avatarEl = document.querySelector('.trainer-avatar-large');
        if (avatarEl) avatarEl.textContent = initials;
      }
    } catch (err) {
      console.error(err);
    }
  }

  // --- APP INITIAL STARTUP ---
  loadTrainerProfile();
  switchTab('dashboard');
  lucide.createIcons();
});
