// nav.js — Injects the persistent bottom navigation bar on every page.
// Include this script at the bottom of every user-facing page.
(function () {
  var excludedPages = ["login.html", "signup.html", "admin.html"];
  var currentPage = window.location.pathname.split("/").pop() || "index.html";

  if (excludedPages.includes(currentPage)) {
    return;
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {
        // Non-blocking: app should work normally even if SW registration fails.
      });
    });
  }

  var nav = document.createElement("nav");
  nav.id = "bottom-nav";

  var links = [
    { href: "index.html",      icon: "home",           label: "Home"     },
    { href: "package.html",    icon: "trending_up",    label: "Invest"   },
    { href: "deposit.html",    icon: "account_balance_wallet", label: "Deposit" },
    { href: "withdrawal.html", icon: "payments",       label: "Cashout"  },
    { href: "profile.html",    icon: "person",         label: "Profile"  },
  ];

  links.forEach(function (item) {
    var a = document.createElement("a");
    a.href = item.href;
    a.title = item.label;
    if (currentPage === item.href) a.classList.add("active");

    var icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.textContent = item.icon;

    var lbl = document.createElement("span");
    lbl.textContent = item.label;

    a.appendChild(icon);
    a.appendChild(lbl);
    nav.appendChild(a);
  });

  // Add padding to body so content isn't hidden behind nav
  document.body.style.paddingBottom = "62px";
  document.body.appendChild(nav);
})();
