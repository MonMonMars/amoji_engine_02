const TOKEN_KEY = "amoji.admin.token";

/** @type {{ permissions: string[], email: string, role: string, roleLabel: string } | null} */
let adminSession = null;
let selectedUserId = null;

function token() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(value) {
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);
}

function hasPerm(key) {
  return Boolean(adminSession?.permissions?.includes(key));
}

async function api(action, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`/api/admin/${action}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function showLogin(show) {
  document.getElementById("login-panel").hidden = !show;
  document.getElementById("shell").hidden = show;
}

function setView(name) {
  document.querySelectorAll(".admin-view").forEach((el) => {
    el.hidden = el.id !== `view-${name}`;
  });
  document.querySelectorAll(".admin-nav-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === name);
  });
}

function applyPermissionUi() {
  document.querySelectorAll("[data-perm]").forEach((el) => {
    const perm = el.getAttribute("data-perm");
    const allowed = perm ? hasPerm(perm) : true;
    el.hidden = !allowed;
    if (el.tagName === "FIELDSET") {
      el.querySelectorAll("input, select, textarea").forEach((input) => {
        input.disabled = !allowed;
      });
    }
  });
}

async function bootstrapSession() {
  const data = await api("session");
  adminSession = data.admin;
  document.getElementById("admin-email").textContent = adminSession.email;
  document.getElementById("admin-role-badge").textContent = adminSession.roleLabel || adminSession.role;
  applyPermissionUi();
  showLogin(false);
  await refreshDashboard();
}

async function refreshDashboard() {
  const cards = document.getElementById("dashboard-cards");
  cards.innerHTML = "";
  const backend = hasPerm("backend.status.read") ? await api("backend") : null;
  const users = hasPerm("users.list") ? await api("users?limit=200") : null;
  const stats = [
    { label: "Build", value: backend?.build || "—" },
    { label: "Users (sample)", value: users?.count ?? "—" },
    { label: "Stripe", value: backend?.env?.stripe ? "on" : "off" },
    { label: "IAP dev", value: backend?.env?.iapDev ? "yes" : "no" },
  ];
  for (const stat of stats) {
    const div = document.createElement("div");
    div.className = "admin-stat";
    div.innerHTML = `<span class="admin-muted">${stat.label}</span><strong>${stat.value}</strong>`;
    cards.appendChild(div);
  }
}

async function refreshUsers(query = "") {
  const q = encodeURIComponent(query.trim());
  const data = await api(`users?limit=200${q ? `&q=${q}` : ""}`);
  const tbody = document.querySelector("#users-table tbody");
  tbody.innerHTML = "";
  for (const row of data.users) {
    const tr = document.createElement("tr");
    tr.dataset.userId = row.userId;
    tr.innerHTML = `<td>${row.userId}</td><td>${row.profile?.displayName || "—"}</td><td>${row.profile?.status || "active"}</td><td>${row.entitlements?.premium ? "yes" : "no"}</td><td>${row.updatedAt || "—"}</td>`;
    tr.addEventListener("click", () => openUser(row.userId));
    tbody.appendChild(tr);
  }
}

async function openUser(userId) {
  selectedUserId = userId;
  document.querySelector('.admin-nav-btn[data-view="user-detail"]').hidden = false;
  setView("user-detail");
  document.getElementById("detail-user-id").textContent = userId;
  const data = await api(`user?userId=${encodeURIComponent(userId)}`);
  const u = data.user;
  const form = document.getElementById("user-form");
  form.displayName.value = u.profile?.displayName || "";
  form.contactEmail.value = u.profile?.contactEmail || "";
  form.status.value = u.profile?.status || "active";
  form.tags.value = (u.profile?.tags || []).join(", ");
  form.notes.value = u.profile?.notes || "";
  form.lang.value = u.settings?.lang || "yue";
  form.voiceEnabled.checked = Boolean(u.settings?.voiceEnabled);
  form.haptics.checked = Boolean(u.settings?.haptics);
  form.premiumPreview.checked = Boolean(u.settings?.premiumPreview);
  form.premium.checked = Boolean(u.entitlements?.premium);
  form.unlimitedChat.checked = Boolean(u.entitlements?.unlimitedChat);
  form.coinPacksGranted.value = Number(u.entitlements?.coinPacksGranted || 0);
}

async function saveUser() {
  if (!selectedUserId) return;
  const form = document.getElementById("user-form");
  /** @type {Record<string, unknown>} */
  const body = {};
  if (hasPerm("users.profile.write")) {
    body.profile = {
      displayName: form.displayName.value.trim(),
      contactEmail: form.contactEmail.value.trim(),
      status: form.status.value,
      tags: form.tags.value.split(",").map((s) => s.trim()).filter(Boolean),
      notes: form.notes.value.trim(),
    };
  }
  if (hasPerm("users.settings.write")) {
    body.settings = {
      lang: form.lang.value,
      voiceEnabled: form.voiceEnabled.checked,
      haptics: form.haptics.checked,
      premiumPreview: form.premiumPreview.checked,
    };
  }
  if (hasPerm("users.entitlements.write")) {
    body.entitlements = {
      premium: form.premium.checked,
      unlimitedChat: form.unlimitedChat.checked,
      coinPacksGranted: Number(form.coinPacksGranted.value || 0),
    };
  }
  await api(`user?userId=${encodeURIComponent(selectedUserId)}`, {
    method: "PATCH",
    body,
  });
  document.getElementById("save-user-msg").textContent = "Saved.";
  await refreshUsers(document.getElementById("user-search").value);
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("login-error");
  errEl.hidden = true;
  try {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const data = await api("login", { method: "POST", body: { email, password } });
    setToken(data.token);
    await bootstrapSession();
  } catch (err) {
    errEl.textContent = err.message || "Login failed";
    errEl.hidden = false;
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  setToken("");
  adminSession = null;
  showLogin(true);
});

document.querySelectorAll(".admin-nav-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const view = btn.dataset.view;
    if (view === "dashboard") {
      setView("dashboard");
      await refreshDashboard();
    } else if (view === "users") {
      setView("users");
      await refreshUsers(document.getElementById("user-search").value);
    } else if (view === "user-detail" && selectedUserId) {
      setView("user-detail");
    } else if (view === "backend") {
      setView("backend");
      document.getElementById("backend-json").textContent = JSON.stringify(
        await api("backend"),
        null,
        2,
      );
    } else if (view === "audit") {
      setView("audit");
      document.getElementById("audit-json").textContent = JSON.stringify(
        await api("audit?limit=80"),
        null,
        2,
      );
    } else if (view === "accounts") {
      setView("accounts");
      document.getElementById("accounts-json").textContent = JSON.stringify(
        await api("accounts"),
        null,
        2,
      );
    }
  });
});

document.getElementById("user-refresh").addEventListener("click", () => {
  refreshUsers(document.getElementById("user-search").value);
});

document.getElementById("user-search").addEventListener("keydown", (e) => {
  if (e.key === "Enter") refreshUsers(e.target.value);
});

document.getElementById("save-user-btn").addEventListener("click", () => {
  saveUser().catch((err) => {
    document.getElementById("save-user-msg").textContent = err.message;
  });
});

(async () => {
  if (!token()) {
    showLogin(true);
    return;
  }
  try {
    await bootstrapSession();
  } catch {
    setToken("");
    showLogin(true);
  }
})();
