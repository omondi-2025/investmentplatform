(function () {
  var PUBLIC_PAGES = ["login.html", "signup.html", "admin.html"];
  var page = window.location.pathname.split("/").pop();
  if (!page) page = "index.html";

  if (PUBLIC_PAGES.indexOf(page) !== -1) return;

  document.documentElement.classList.add("auth-protected");

  function redirectToLogin() {
    try {
      sessionStorage.removeItem("tc_token");
      sessionStorage.removeItem("tc_user");
      if (localStorage.getItem("tc_remember_me") !== "1") {
        localStorage.removeItem("tc_token");
        localStorage.removeItem("tc_user");
      }
    } catch (err) {
      // ignore storage errors
    }
    window.location.replace("login.html");
  }

  var token = "";
  var userRaw = null;
  try {
    token = sessionStorage.getItem("tc_token") || localStorage.getItem("tc_token") || "";
    userRaw = sessionStorage.getItem("tc_user") || localStorage.getItem("tc_user");
  } catch (err) {
    redirectToLogin();
    return;
  }

  if (!token || !userRaw) {
    redirectToLogin();
    return;
  }

  try {
    var user = JSON.parse(userRaw);
    if (!user || !user._id) {
      redirectToLogin();
      return;
    }
  } catch (err) {
    redirectToLogin();
    return;
  }

  document.documentElement.classList.add("auth-verified");
})();
