function findPrivacyPolicyLink() {
  const links = Array.from(document.querySelectorAll("a"));

  const strongTextKeywords = [
    "polityka prywatności",
    "polityka prywatnosci",
    "privacy policy",
    "privacy notice"
  ];

  const strongHrefKeywords = [
    "polityka-prywatnosci",
    "polityka_prywatnosci",
    "privacy-policy",
    "privacy_policy",
    "privacy/policy",
    "privacy"
  ];

  for (const link of links) {
    const text = (link.innerText || link.textContent || "").toLowerCase().trim();

    if (!link.href) continue;

    const isStrongTextMatch = strongTextKeywords.some(keyword => text === keyword);

    if (isStrongTextMatch) {
      return link.href;
    }
  }

  for (const link of links) {
    const text = (link.innerText || link.textContent || "").toLowerCase().trim();

    if (!link.href) continue;

    const isTextMatch = strongTextKeywords.some(keyword => text.includes(keyword));

    if (isTextMatch) {
      return link.href;
    }
  }

  for (const link of links) {
    const href = (link.href || "").toLowerCase();

    if (!link.href) continue;

    const isHrefMatch = strongHrefKeywords.some(keyword => href.includes(keyword));

    if (isHrefMatch) {
      return link.href;
    }
  }

  return null;
}

function collectPageData() {
  return {
    url: window.location.href,
    title: document.title || "",
    domContent: document.documentElement?.outerHTML || document.body?.innerText || ""
  };
}

function notifyPageLoaded() {
  if (!isScannablePage()) {
    return;
  }

  chrome.runtime.sendMessage({
    action: "pageLoaded",
    data: collectPageData()
  }).catch((error) => {
    console.debug("Nie udało się uruchomić automatycznego skanu:", error);
  });
}

function isScannablePage() {
  return window.location.protocol === "http:" || window.location.protocol === "https:";
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "collectPageData") {
    sendResponse({
      success: true,
      ...collectPageData()
    });
    return;
  }

  if (message.action !== "findPrivacyPolicy") {
    return;
  }

  const privacyUrl = findPrivacyPolicyLink();

  if (!privacyUrl) {
    sendResponse({
      success: false,
      error: "Nie znaleziono linku do polityki prywatności na tej stronie."
    });
    return;
  }

  sendResponse({
    success: true,
    sourcePage: window.location.href,
    privacyUrl: privacyUrl
  });
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(notifyPageLoaded, 1200);
  }, { once: true });
} else {
  setTimeout(notifyPageLoaded, 1200);
}

// ---------------------------------------------------------------------------
// Log kategorii danych z formularzy (bez wartości) → POST /api/submitted-data
// ---------------------------------------------------------------------------

function inferDataCategoriesFromForm(form) {
  const categories = new Set();
  const controls = form.querySelectorAll("input, select, textarea");

  controls.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    if (el.hasAttribute("disabled")) return;

    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute("type") || "text").toLowerCase();
    if (type === "hidden" || type === "submit" || type === "button" || type === "reset" || type === "image") {
      return;
    }

    const name = (el.getAttribute("name") || "").toLowerCase();
    const ac = (el.getAttribute("autocomplete") || "").toLowerCase();
    const id = (el.getAttribute("id") || "").toLowerCase();
    const key = `${name} ${id} ${ac}`;

    if (type === "email" || ac.includes("email")) {
      categories.add("email");
    } else if (type === "password") {
      categories.add("password");
    } else if (type === "tel" || ac.includes("tel") || ac === "mobile-phone") {
      categories.add("phone");
    } else if (type === "date" || ac.includes("bday")) {
      categories.add("date_of_birth");
    } else if (
      key.includes("credit") ||
      key.includes("card") ||
      key.includes("ccnumber") ||
      ac.includes("cc-")
    ) {
      categories.add("credit_card");
    } else if (
      key.includes("iban") ||
      key.includes("bank") ||
      (key.includes("account") && !key.includes("username")) ||
      ac.includes("bank")
    ) {
      categories.add("bank_account");
    } else if (
      key.includes("pesel") ||
      key.includes("ssn") ||
      key.includes("national") ||
      ac.includes("national-id")
    ) {
      categories.add("national_id");
    } else if (
      key.includes("address") ||
      key.includes("street") ||
      key.includes("zip") ||
      key.includes("postal") ||
      ac.includes("address")
    ) {
      categories.add("address");
    } else if (
      (key.includes("name") || ac.includes("name")) &&
      !key.includes("username") &&
      !ac.includes("username")
    ) {
      categories.add("full_name");
    } else if (
      tag === "textarea" &&
      (key.includes("message") || key.includes("comment") || key.includes("bio"))
    ) {
      categories.add("other");
    }
  });

  return Array.from(categories);
}

document.addEventListener(
  "submit",
  (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!isScannablePage()) return;

    const dataCategories = inferDataCategoriesFromForm(form);
    if (!dataCategories.length) return;

    chrome.runtime
      .sendMessage({
        action: "submittedData",
        data: {
          site_url: window.location.href,
          data_categories: dataCategories
        }
      })
      .catch(() => {});
  },
  true
);
