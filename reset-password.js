const resetPasswordForm = document.getElementById("resetPasswordForm");
const newPassword = document.getElementById("newPassword");
const resetMessage = document.getElementById("resetMessage");

function showMessage(message, isError = false) {
  resetMessage.textContent = message;
  resetMessage.style.color = isError ? "#ef4444" : "#22c55e";
}

resetPasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = newPassword.value.trim();

  if (!password) {
    showMessage("Entre un nouveau mot de passe.", true);
    return;
  }

  try {
    // 🔥 Met à jour le mot de passe
    const { error } = await supabaseClient.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error(error);
      showMessage("Erreur lors de la mise à jour du mot de passe.", true);
      return;
    }

    showMessage("Mot de passe mis à jour avec succès.");

    // 🔁 redirection après succès
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);

  } catch (err) {
    console.error(err);
    showMessage("Une erreur est survenue.", true);
  }
});