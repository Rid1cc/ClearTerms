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
