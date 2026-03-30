const adminLoginCard = document.getElementById("adminLoginCard");
const adminPanel = document.getElementById("adminPanel");
const adminAuthEmail = document.getElementById("adminAuthEmail");
const adminAuthPassword = document.getElementById("adminAuthPassword");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const adminMessage = document.getElementById("adminMessage");
const adminEmail = document.getElementById("adminEmail");
const adminRequestsList = document.getElementById("adminRequestsList");
const pendingRequestsCount = document.getElementById("pendingRequestsCount");
const proProfilesCount = document.getElementById("proProfilesCount");

let currentAdmin = null;
let paymentRequests = [];

function showAdminMessage(message, isError = false) {
  adminMessage.textContent = message;
  adminMessage.style.opacity = "1";
  adminMessage.style.color = isError ? "#dc2626" : "#16a34a";

  setTimeout(() => {
    if (adminMessage.textContent === message) {
      adminMessage.style.opacity = "0";
    }
  }, 3000);
}

function showAdminPanel() {
  adminLoginCard.classList.add("hidden");
  adminPanel.classList.remove("hidden");
}

function showAdminLogin() {
  adminPanel.classList.add("hidden");
  adminLoginCard.classList.remove("hidden");
}

async function isAdmin() {
  if (!currentAdmin) return false;

  const { data, error } = await supabaseClient
    .from("admins")
    .select("*")
    .eq("user_id", currentAdmin.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return false;
  }

  return !!data;
}

async function loadDashboardCounts() {
  const { count: pendingCount, error: pendingError } = await supabaseClient
    .from("payment_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: proCount, error: proError } = await supabaseClient
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("plan", "pro");

  if (pendingError) console.error(pendingError);
  if (proError) console.error(proError);

  pendingRequestsCount.textContent = pendingCount || 0;
  proProfilesCount.textContent = proCount || 0;
}

async function loadPaymentRequests() {
  const { data, error } = await supabaseClient
    .from("payment_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    showAdminMessage("Impossible de charger les demandes.", true);
    return;
  }

  paymentRequests = data || [];
  renderRequests();
  await loadDashboardCounts();
}

function renderRequests() {
  adminRequestsList.innerHTML = "";

  if (paymentRequests.length === 0) {
    adminRequestsList.innerHTML = `
      <div class="empty-state">
        Aucune demande de paiement.
      </div>
    `;
    return;
  }

  paymentRequests.forEach((request) => {
    const card = document.createElement("div");
    card.className = "order-card";

    card.innerHTML = `
      <div class="order-info">
        <h4>${request.email}</h4>
        <p><strong>Montant :</strong> ${request.amount} FCFA</p>
        <p><strong>Téléphone payeur :</strong> ${request.payer_phone || "Non défini"}</p>
        <p><strong>Statut :</strong> ${request.status}</p>
        <p><strong>Date :</strong> ${new Date(request.created_at).toLocaleString("fr-FR")}</p>
        <p><a href="${request.proof_url}" target="_blank">Voir la capture</a></p>
      </div>

      <div class="order-actions">
        <button class="small-btn edit-btn" onclick="activatePro(${request.id}, '${request.user_id}', '${request.email}')">
          Activer Pro
        </button>
        <button class="small-btn delete-btn" onclick="rejectRequest(${request.id}, '${request.user_id}')">
          Rejeter
        </button>
      </div>
    `;

    adminRequestsList.appendChild(card);
  });
}

async function activatePro(requestId, userId, email) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { error: profileError } = await supabaseClient
    .from("profiles")
    .update({
      plan: "pro",
      order_limit: 999999,
      payment_status: "paid",
      plan_expires_at: expiresAt.toISOString(),
      notification_title: "Abonnement Pro activé",
      notification_message: "Votre abonnement Pro a été activé avec succès pour 30 jours.",
      notification_type: "success",
      notification_read: false,
    })
    .eq("id", userId);

  if (profileError) {
    console.error(profileError);
    showAdminMessage("Impossible d'activer Pro.", true);
    return;
  }

  await supabaseClient
    .from("payment_requests")
    .update({ status: "approved" })
    .eq("id", requestId);

  showAdminMessage(`Compte Pro activé pour ${email}.`);
  await loadPaymentRequests();
}

async function rejectRequest(requestId, userId) {
  const { error: requestError } = await supabaseClient
    .from("payment_requests")
    .update({ status: "rejected" })
    .eq("id", requestId);

  if (requestError) {
    console.error(requestError);
    showAdminMessage("Impossible de rejeter la demande.", true);
    return;
  }

  const { error: profileError } = await supabaseClient
    .from("profiles")
    .update({ payment_status: "none" })
    .eq("id", userId);

  if (profileError) {
    console.error(profileError);
  }

  showAdminMessage("Demande rejetée.");
  await loadPaymentRequests();
}

async function adminLogin() {
  const email = adminAuthEmail.value.trim();
  const password = adminAuthPassword.value.trim();

  if (!email || !password) {
    showAdminMessage("Veuillez remplir tous les champs.", true);
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(error);
    showAdminMessage(error.message, true);
    return;
  }

  currentAdmin = data.user;

  const ok = await isAdmin();
  if (!ok) {
    await supabaseClient.auth.signOut();
    currentAdmin = null;
    showAdminMessage("Accès refusé.", true);
    return;
  }

  adminEmail.textContent = currentAdmin.email;
  showAdminPanel();
  await loadPaymentRequests();
}

async function adminLogout() {
  await supabaseClient.auth.signOut();
  currentAdmin = null;
  paymentRequests = [];
  adminRequestsList.innerHTML = "";
  showAdminLogin();
}

async function checkAdminSession() {
  const { data } = await supabaseClient.auth.getUser();

  if (!data.user) {
    showAdminLogin();
    return;
  }

  currentAdmin = data.user;
  const ok = await isAdmin();

  if (!ok) {
    await supabaseClient.auth.signOut();
    currentAdmin = null;
    showAdminLogin();
    return;
  }

  adminEmail.textContent = currentAdmin.email;
  showAdminPanel();
  await loadPaymentRequests();
}

adminLoginBtn.addEventListener("click", adminLogin);
adminLogoutBtn.addEventListener("click", adminLogout);

checkAdminSession();
