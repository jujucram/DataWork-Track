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
let profileChannel = null;
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const installBanner = document.getElementById("installBanner");
  if (installBanner) {
    installBanner.classList.remove("hidden");
  }
});

const installAppBtn = document.getElementById("installAppBtn");
if (installAppBtn) {
  installAppBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;

    const installBanner = document.getElementById("installBanner");
    if (installBanner) {
      installBanner.classList.add("hidden");
    }
  });
}

function subscribeToProfileChanges() {
  if (!currentUser) return;

  if (profileChannel) {
    supabaseClient.removeChannel(profileChannel);
  }

  profileChannel = supabaseClient
    .channel("profile-changes-" + currentUser.id)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${currentUser.id}`,
      },
      async () => {
        await loadUserProfile();
      }
    )
    .subscribe();
}

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
    subscribeToProfileChanges();
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
    redirectTo: "https://datawork-track.netlify.app/reset-password.html",
  });

  if (error) {
    console.error("RESET ERROR:", error);
    showAuthMessage(error.message, true);
    return;
  }

  showAuthMessage("Un lien de réinitialisation a été envoyé. Vérifiez votre boîte de réception ou vos spams.");
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
  const subscriptionAlert = document.getElementById("subscriptionAlert");
  const userNotification = document.getElementById("userNotification");
  const userNotificationTitle = document.getElementById("userNotificationTitle");
  const userNotificationMessage = document.getElementById("userNotificationMessage");

  if (subscriptionAlert) {
    subscriptionAlert.className = "subscription-alert hidden";
    subscriptionAlert.textContent = "";
  }

  if (userNotification) {
    userNotification.className = "user-notification hidden";
  }

  let isExpired = false;
  let daysLeft = null;

  if (profile.plan === "pro" && profile.plan_expires_at) {
    const now = new Date();
    const expiryDate = new Date(profile.plan_expires_at);
    const diffMs = expiryDate.getTime() - now.getTime();
    daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs <= 0) {
      isExpired = true;

      await supabaseClient
        .from("profiles")
        .update({
          plan: "free",
          order_limit: 20,
          payment_status: "none",
          notification_title: "Abonnement expiré",
          notification_message: "Votre abonnement Pro a expiré. Veuillez renouveler pour continuer.",
          notification_type: "expired",
          notification_read: false,
        })
        .eq("id", currentUser.id);

      profile.plan = "free";
      profile.order_limit = 20;
      profile.payment_status = "none";
    }
  }

  if (profile.plan === "pro") {
    const expiryText = profile.plan_expires_at
      ? `<div style="font-size:12px; color:#64748b; margin-top:4px;">
           Expire le ${new Date(profile.plan_expires_at).toLocaleDateString("fr-FR")}
         </div>`
      : "";

    userGreeting.innerHTML = `
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
          background:rgba(34,197,94,0.12);
          color:#16a34a;
          padding:6px 12px;
          border-radius:999px;
          font-size:13px;
          width:fit-content;
        ">
          <i class="fa-solid fa-circle-check"></i>
          Abonnement actif
        </div>

        ${expiryText}
      </div>
    `;

    upgradeBtns.forEach((btn) => {
      btn.style.display = "none";
    });

    if (subscriptionAlert && daysLeft !== null && daysLeft <= 7 && daysLeft > 0) {
      subscriptionAlert.textContent =
        `Votre abonnement Pro expire bientôt. Il vous reste ${daysLeft} jour${daysLeft > 1 ? "s" : ""}.`;
      subscriptionAlert.className = "subscription-alert warning";

      if (!profile.notification_read) {
        // on laisse la notification admin prioritaire si elle existe
      } else {
        await supabaseClient
          .from("profiles")
          .update({
            notification_title: "Abonnement bientôt expiré",
            notification_message: `Votre abonnement Pro expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}.`,
            notification_type: "warning",
            notification_read: false,
          })
          .eq("id", currentUser.id);
      }
    }
  } else {
    userGreeting.innerHTML = `
      <i class="fa-solid fa-user"></i> ${currentUser.email}
    `;

    upgradeBtns.forEach((btn) => {
      btn.style.display = "inline-block";
    });

    if (subscriptionAlert && isExpired) {
      subscriptionAlert.textContent =
        "Votre abonnement Pro a expiré. Votre compte est repassé au plan gratuit.";
      subscriptionAlert.className = "subscription-alert expired";
    }
  }

  if (profile.notification_title && profile.notification_message && !profile.notification_read && userNotification) {
    userNotificationTitle.textContent = profile.notification_title;
    userNotificationMessage.textContent = profile.notification_message;
    userNotification.className = `user-notification ${profile.notification_type || "info"}`;

    setTimeout(async () => {
      await supabaseClient
        .from("profiles")
        .update({ notification_read: true })
        .eq("id", currentUser.id);
    }, 4000);
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

async function exportOrders() {
  if (orders.length === 0) {
    showMessage("Aucune commande à exporter.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 10;

  // Titre
  doc.setFontSize(16);
  doc.text("DataWork Track - Commandes", 10, y);
  y += 10;

  doc.setFontSize(10);
  doc.text(`Date : ${new Date().toLocaleDateString("fr-FR")}`, 10, y);
  y += 10;

  // Liste des commandes
  orders.forEach((order, index) => {
    if (y > 270) {
      doc.addPage();
      y = 10;
    }

    doc.setFontSize(11);
    doc.text(`Commande ${index + 1}`, 10, y);
    y += 6;

    doc.setFontSize(10);
    doc.text(`Client : ${order.client_name}`, 10, y);
    y += 5;

    doc.text(`Téléphone : ${order.client_phone}`, 10, y);
    y += 5;

    doc.text(`Produit : ${order.product}`, 10, y);
    y += 5;

    doc.text(`Prix : ${order.price} FCFA`, 10, y);
    y += 5;

    doc.text(`Statut : ${order.status}`, 10, y);
    y += 5;

    doc.text(`Date : ${order.order_date || "Non définie"}`, 10, y);
    y += 8;
  });

  doc.save("datawork-orders.pdf");

  showMessage("Export PDF réussi.");
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

  showAuthMessage("Compte créé. Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez vos spams.");
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
    subscribeToProfileChanges();
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
