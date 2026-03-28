const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const authMessage = document.getElementById("authMessage");
const logoutBtn = document.getElementById("logoutBtn");
const userGreeting = document.getElementById("userGreeting");
const appLoader = document.getElementById("appLoader");
const orderForm = document.getElementById("orderForm");
const ordersList = document.getElementById("ordersList");
const totalOrders = document.getElementById("totalOrders");
const pendingOrders = document.getElementById("pendingOrders");
const deliveredOrders = document.getElementById("deliveredOrders");
const totalRevenue = document.getElementById("totalRevenue");
const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const successMessage = document.getElementById("successMessage");
const clearAllBtn = document.getElementById("clearAllBtn");
const exportBtn = document.getElementById("exportBtn");
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const footerYear = document.getElementById("footerYear");

const clientNameInput = document.getElementById("clientName");
const clientPhoneInput = document.getElementById("clientPhone");
const productInput = document.getElementById("product");
const priceInput = document.getElementById("price");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

let orders = [];
let editId = null;
let currentUser = null;
let appInitialized = false;

async function initializeApp() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("Erreur session:", error);
    showAuth();
    appInitialized = true;
    return;
  }

  if (data.user) {
    currentUser = data.user;
    showApp();
    await loadUserProfile();
    await loadOrders();
  } else {
    currentUser = null;
    showAuth();
  }

  appInitialized = true;
}

if (footerYear) {
  footerYear.textContent = new Date().getFullYear();
}

async function forgotPassword() {
  const email = authEmail.value.trim();

  if (!email) {
    showAuthMessage("Entre d'abord ton adresse e-mail.", true);
    return;
  }

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset-password.html",
  });

  if (error) {
    console.error(error);
    showAuthMessage("Impossible d'envoyer l'e-mail de réinitialisation.", true);
    return;
  }

  showAuthMessage("Lien envoyé. Vérifie ton e-mail.");
}
if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener("click", forgotPassword);
}

function showAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.opacity = "1";
  authMessage.style.color = isError ? "#dc2626" : "#16a34a";

  setTimeout(() => {
    if (authMessage.textContent === message) {
      authMessage.style.opacity = "0";
    }
  }, 2500);
}

function showMessage(message, isError = false) {
  successMessage.textContent = message;
  successMessage.style.opacity = "1";
  successMessage.style.color = isError ? "#dc2626" : "#16a34a";

  setTimeout(() => {
    if (successMessage.textContent === message) {
      successMessage.style.opacity = "0";
    }
  }, 2200);
}

function showAuth() {
  authSection.classList.remove("hidden");
  appSection.classList.add("hidden");
  appLoader.classList.add("hidden");
}

function showApp() {
  appSection.classList.remove("hidden");
  authSection.classList.add("hidden");
  appLoader.classList.add("hidden");
}

function resetFormState() {
  orderForm.reset();
  editId = null;
  formTitle.textContent = "Ajouter une commande";
  submitBtn.textContent = "Ajouter la commande";
  cancelEditBtn.classList.add("hidden");
}

function updateStats() {
  let deliveredCount = 0;
  let pendingCount = 0;
  let revenue = 0;

  for (let i = 0; i < orders.length; i++) {
    if (orders[i].status === "Livrée") {
      deliveredCount++;
      revenue += Number(orders[i].price);
    } else {
      pendingCount++;
    }
  }

  totalOrders.textContent = orders.length;
  pendingOrders.textContent = pendingCount;
  deliveredOrders.textContent = deliveredCount;
  totalRevenue.textContent = revenue + " FCFA";
}

function getFilteredOrders() {
  const searchValue = searchInput.value.toLowerCase().trim();
  const filterValue = filterStatus.value;

  return orders.filter((order) => {
    const name = (order.client_name || "").toLowerCase();
    const phone = (order.client_phone || "").toLowerCase();
    const product = (order.product || "").toLowerCase();

    const matchesSearch =
      searchValue === "" ||
      name.includes(searchValue) ||
      phone.includes(searchValue) ||
      product.includes(searchValue);

    const matchesFilter =
      filterValue === "all" || order.status === filterValue;

    return matchesSearch && matchesFilter;
  });
}

function renderOrders() {
  ordersList.innerHTML = "";

  const filteredOrders = getFilteredOrders();
  if (filteredOrders.length === 0) {
    ordersList.innerHTML = `
      <div class="empty-state">
        Aucune commande ne correspond à votre recherche actuelle.
      </div>
    `;
    updateStats();
    return;
  }

  for (let i = 0; i < filteredOrders.length; i++) {
    const order = filteredOrders[i];
    const statusClass = order.status === "Livrée" ? "delivered" : "pending";
    const toggleText =
      order.status === "En attente" ? "Marquer livrée" : "Remettre en attente";

    const card = document.createElement("div");
    card.className = "order-card";

    card.innerHTML = `
      <div class="order-info">
        <h4>${order.client_name}</h4>
        <p><strong>Téléphone :</strong> ${order.client_phone}</p>
        <p><strong>Produit :</strong> ${order.product}</p>
        <p><strong>Prix :</strong> ${order.price} FCFA</p>
        <p><strong>Date :</strong> ${order.order_date || "Non définie"}</p>
        <p class="status ${statusClass}">
          <strong>Statut :</strong> ${order.status}
        </p>
      </div>

      <div class="order-actions">
        <button class="small-btn toggle-btn" onclick="toggleStatus(${order.id}, '${order.status}')">
          ${toggleText}
        </button>

        <button class="small-btn edit-btn" onclick="editOrder(${order.id})">
          Modifier
        </button>

        <button class="small-btn whatsapp-btn" onclick="openWhatsApp('${order.client_phone}')">
          WhatsApp
        </button>

        <button class="small-btn delete-btn" onclick="deleteOrder(${order.id})">
          Supprimer
        </button>
      </div>
    `;

    ordersList.appendChild(card);
  }

  updateStats();
}

async function loadOrders() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("orders")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    showMessage("Erreur lors du chargement des commandes.", true);
    return;
  }

  orders = data || [];
  renderOrders();
}

async function deleteOrder(id) {
  const ok = confirm("Supprimer cette commande ?");
  if (!ok) return;

  const { error } = await supabaseClient
    .from("orders")
    .delete()
    .eq("id", id)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error(error);
    showMessage("Erreur lors de la suppression.", true);
    return;
  }

  showMessage("Commande supprimée.");
  await loadOrders();
}
async function loadUserProfile() {
  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error || !profile) {
    console.error("Erreur profil:", error);
    return;
  }

  const userGreeting = document.getElementById("userGreeting");
  const upgradeBtns = document.querySelectorAll(".upgradeBtn");

  if (profile.plan === "pro") {
    userGreeting.innerHTML =` 
  <div style="display:flex; flex-direction:column; gap:10px;">

    <div>
      <i class="fa-solid fa-user"></i> ${currentUser.email}
      <span style="color:#f59e0b; font-weight:700; margin-left:8px;">
        <i class="fa-solid fa-crown"></i> PRO
      </span>
    </div>

    <div style="
      display:inline-flex;
      align-items:center;
      gap:6px;
      background:#16a34a20;
      color:#16a34a;
      padding:6px 12px;
      border-radius:999px;
      font-size:13px;
      width:fit-content;
    ">
      <i class="fa-solid fa-circle-check"></i>
      Abonnement actif
    </div>

  </div>
`;

    upgradeBtns.forEach((btn) => {
      btn.style.display = "none";
    });
  } else {
    userGreeting.innerHTML =` 
      <i class="fa-solid fa-user"></i> ${currentUser.email}
    `;

    upgradeBtns.forEach((btn) => {
      btn.style.display = "inline-block";
    });
  }
}

async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === "En attente" ? "Livrée" : "En attente";

  const { error } = await supabaseClient
    .from("orders")
    .update({ status: newStatus })
    .eq("id", id)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error(error);
    showMessage("Erreur lors du changement de statut.", true);
    return;
  }

  showMessage("Statut mis à jour.");
  await loadOrders();
}

function editOrder(id) {
  const order = orders.find((item) => item.id === id);
  if (!order) return;

  clientNameInput.value = order.client_name;
  clientPhoneInput.value = order.client_phone;
  productInput.value = order.product;
  priceInput.value = order.price;

  editId = id;
  formTitle.textContent = "Modifier une commande";
  submitBtn.textContent = "Enregistrer les modifications";
  cancelEditBtn.classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function openWhatsApp(phone) {
  const cleanPhone = String(phone).replace(/\D/g, "");
  const fullPhone = cleanPhone.startsWith("237")
    ? cleanPhone
    : "237" + cleanPhone;

  window.open("https://wa.me/" + fullPhone, "_blank");
}

function exportOrders() {
  if (orders.length === 0) {
    showMessage("Aucune commande à exporter.");
    return;
  }

  const dataStr = JSON.stringify(orders, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "datawork-orders.json";
  link.click();
  URL.revokeObjectURL(url);
  showMessage("Export effectué.");
}

async function signUp() {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  if (!email || !password) {
    showAuthMessage("Veuillez remplir tous les champs.", true);
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error(error);
    showAuthMessage(error.message, true);
    return;
  }

  showAuthMessage("Compte créé. Connecte-toi maintenant.");
}

async function signIn() {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  if (!email || !password) {
    showAuthMessage("Veuillez remplir tous les champs.", true);
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(error);
    showAuthMessage(error.message, true);
    return;
  }

  currentUser = data.user;
  showApp();
  await loadUserProfile();
  await loadOrders();
}

async function logout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  orders = [];
  showAuth();
}

orderForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const clientName = clientNameInput.value.trim();
  const clientPhone = clientPhoneInput.value.trim();
  const product = productInput.value.trim();
  const price = priceInput.value.trim();

  if (!clientName || !clientPhone || !product || !price) {
    showMessage("Veuillez remplir tous les champs.", true);
    return;
  }
  const { data: profile, error: profileError } = await supabaseClient
  .from("profiles")
  .select("*")
  .eq("id", currentUser.id)
  .maybeSingle();

console.log("currentUser.id:", currentUser.id);
console.log("profile trouvé:", profile);
console.log("profileError:", profileError);

if (profileError) {
  showMessage("Impossible de charger votre profil.", true);
  console.error("Erreur profil:", profileError);
  return;
}

if (!profile) {
  showMessage("Profil utilisateur introuvable. Déconnecte-toi puis reconnecte-toi.", true);
  return;
}

const { count, error: countError } = await supabaseClient
  .from("orders")
  .select("*", { count: "exact", head: true })
  .eq("user_id", currentUser.id);

if (countError) {
  showMessage("Impossible de vérifier votre limite actuelle.", true);
  console.error("Erreur count:", countError);
  return;
}

if (count >= profile.order_limit) {
  window.location.href = "upgrade.html";
return;
}

  if (!currentUser) {
    showMessage("Utilisateur non connecté.", true);
    return;
  }

  if (editId !== null) {
    const { error } = await supabaseClient
      .from("orders")
      .update({
        client_name: clientName,
        client_phone: clientPhone,
        product,
        price: Number(price),
      })
      .eq("id", editId)
      .eq("user_id", currentUser.id);

    if (error) {
      console.error(error);
      showMessage("Erreur lors de la modification.", true);
      return;
    }

    showMessage("Commande modifiée.");
    resetFormState();
    await loadOrders();
    return;
  }

  const { error } = await supabaseClient
    .from("orders")
    .insert([
      {
        client_name: clientName,
        client_phone: clientPhone,
        product,
        price: Number(price),
        status: "En attente",
        order_date: new Date().toLocaleDateString("fr-FR"),
        user_id: currentUser.id,
      },
    ]);

  if (error) {
    console.error(error);
    showMessage("Erreur lors de l'ajout.", true);
    return;
  }

  showMessage("Commande ajoutée avec succès.");
  resetFormState();
  await loadOrders();
});

cancelEditBtn.addEventListener("click", function () {
  resetFormState();
  showMessage("Modification annulée.");
});

searchInput.addEventListener("input", renderOrders);
filterStatus.addEventListener("change", renderOrders);

clearAllBtn.addEventListener("click", async function () {
  if (orders.length === 0) {
    showMessage("Aucune commande à supprimer.");
    return;
  }

  const ok = confirm("Supprimer toutes les commandes ?");
  if (!ok) return;

  const { error } = await supabaseClient
    .from("orders")
    .delete()
    .eq("user_id", currentUser.id);

  if (error) {
    console.error(error);
    showMessage("Erreur lors de la suppression globale.", true);
    return;
  }

  showMessage("Toutes les commandes ont été supprimées.");
  resetFormState();
  await loadOrders();
});

exportBtn.addEventListener("click", exportOrders);
signInBtn.addEventListener("click", signIn);
signUpBtn.addEventListener("click", signUp);
logoutBtn.addEventListener("click", logout);

async function checkSession() {
  const { data } = await supabaseClient.auth.getUser();
  if (data.user) {
  currentUser = data.user;
  await loadUserProfile();
  showApp();
  await loadOrders();
} else {
  showAuth();
}
}

initializeApp();
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (!appInitialized) return;

  if (session?.user) {
    currentUser = session.user;
    showApp();
    await loadUserProfile();
    await loadOrders();
  } else {
    currentUser = null;
    showAuth();
  }
});
function showUpgradeModal() {
  const modal = document.getElementById("upgradeModal");
  modal.classList.remove("hidden");
}
function closeModal() {
  document.getElementById("upgradeModal").classList.add("hidden");
}
const upgradeBtns = document.querySelectorAll(".upgradeBtn");

upgradeBtns.forEach((btn) => {
  btn.addEventListener("click", function () {
    window.location.href = "upgrade.html";
  });
});
