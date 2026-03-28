const payerPhone = document.getElementById("payerPhone");
const proofFile = document.getElementById("proofFile");
const submitPaymentBtn = document.getElementById("submitPaymentBtn");
const backToAppBtn = document.getElementById("backToAppBtn");
const upgradeMessage = document.getElementById("upgradeMessage");

let currentUser = null;

function showUpgradeMessage(message, isError = false) {
  upgradeMessage.textContent = message;
  upgradeMessage.style.opacity = "1";
  upgradeMessage.style.color = isError ? "#dc2626" : "#16a34a";

  setTimeout(() => {
    if (upgradeMessage.textContent === message) {
      upgradeMessage.style.opacity = "0";
    }
  }, 3000);
}

async function checkUpgradeSession() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("Erreur session:", error);
    showUpgradeMessage("Erreur de session. Reconnectez-vous.", true);
    return;
  }

  if (!data.user) {
    showUpgradeMessage("Session expirée. Reconnectez-vous.", true);
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
    return;
  }

  currentUser = data.user;
}

async function submitPaymentProof() {
  if (!currentUser) {
    showUpgradeMessage("Utilisateur non connecté.", true);
    return;
  }
  const { data: currentProfile, error: currentProfileError } = await supabaseClient
  .from("profiles")
  .select("*")
  .eq("id", currentUser.id)
  .maybeSingle();

if (currentProfileError) {
  console.error(currentProfileError);
  showUpgradeMessage("Impossible de charger votre profil.", true);
  return;
}

if (!currentProfile) {
  showUpgradeMessage("Profil introuvable. Déconnecte-toi puis reconnecte-toi.", true);
  return;
}

  const phone = payerPhone.value.trim();
  const file = proofFile.files[0];

  if (!phone) {
    showUpgradeMessage("Ajoute le numéro ayant effectué le paiement.", true);
    return;
  }

  if (!file) {
    showUpgradeMessage("Ajoute la capture d’écran du paiement.", true);
    return;
  }

  const fileExt = file.name.split(".").pop();
  const filePath = `${currentUser.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("payment-proofs")
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    console.error(uploadError);
    showUpgradeMessage("Erreur lors de l’envoi de la capture.", true);
    return;
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from("payment-proofs")
    .getPublicUrl(filePath);

  const proofUrl = publicUrlData.publicUrl;

  const { error: insertError } = await supabaseClient
    .from("payment_requests")
    .insert([
      {
        user_id: currentUser.id,
        email: currentUser.email,
        amount: 2000,
        payer_phone: phone,
        proof_url: proofUrl,
        status: "pending",
      },
    ]);

  if (insertError) {
    console.error(insertError);
    showUpgradeMessage("Erreur lors de l’enregistrement de la demande.", true);
    return;
  }

  const { error: profileError } = await supabaseClient
    .from("profiles")
    .update({ payment_status: "pending" })
    .eq("id", currentUser.id);

  if (profileError) {
    console.error(profileError);
  }

  const whatsappMessage =
    `Bonjour DataWork Agency,%0A%0A` +
    `Je viens d'envoyer ma preuve de paiement pour DataWork Track Pro.%0A` +
    `Email: ${currentUser.email}%0A` +
    `Téléphone payeur: ${phone}%0A%0A` +
    `Merci de vérifier et d'activer mon compte`;

  const whatsappUrl = `https://wa.me/237673355468?text=${whatsappMessage}`;
  window.open(whatsappUrl, "_blank");

  showUpgradeMessage("Preuve envoyée. Continuez sur WhatsApp.");
}

submitPaymentBtn.addEventListener("click", submitPaymentProof);

backToAppBtn.addEventListener("click", function () {
  window.location.href = "index.html";
});

checkUpgradeSession();