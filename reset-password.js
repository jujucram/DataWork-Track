const resetPasswordForm = document.getElementById("resetPasswordForm");
const newPassword = document.getElementById("newPassword");
const resetMessage = document.getElementById("resetMessage");

function showMessage(message, isError = false) {
  resetMessage.textContent = message;
  resetMessage.style.color = isError ? "#ef4444" : "#22c55e";
}

async function prepareRecoverySession() {
  try {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.substring(1)
      : "";

    const hashParams = new URLSearchParams(hash);

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = hashParams.get("type");

    if (type === "recovery" && accessToken && refreshToken) {
      const { error } = await supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error("Erreur setSession:", error);
        showMessage("Lien de réinitialisation invalide ou expiré.", true);
        return false;
      }

      return true;
    }

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("Erreur session:", error);
      showMessage("Impossible de vérifier la session de réinitialisation.", true);
      return false;
    }

    if (!data.session) {
      showMessage("Lien invalide ou expiré. Redemande un nouveau lien.", true);
      return false;
    }

    return true;
  } catch (err) {
    console.error(err);
    showMessage("Une erreur est survenue pendant la préparation du reset.", true);
    return false;
  }
}

resetPasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = newPassword.value.trim();

  if (!password) {
    showMessage("Entre un nouveau mot de passe.", true);
    return;
  }

  const ok = await prepareRecoverySession();
  if (!ok) return;

  const { error } = await supabaseClient.auth.updateUser({
    password: password,
  });

  if (error) {
    console.error("Erreur updateUser:", error);
    showMessage("Impossible de mettre à jour le mot de passe.", true);
    return;
  }

  showMessage("Mot de passe mis à jour avec succès.");

  await supabaseClient.auth.signOut();

  setTimeout(() => {
    window.location.href = "index.html";
  }, 1800);
});

window.addEventListener("load", async () => {
  await prepareRecoverySession();
});
