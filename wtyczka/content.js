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
    sourcePage: window.location.href,
    privacyUrl: findPrivacyPolicyLink()
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "collectPageData") {
    const data = collectPageData();

    if (!data.privacyUrl) {
      sendResponse({
        success: false,
        error: "No privacy policy link was found on this page."
      });
      return;
    }

    sendResponse({
      success: true,
      ...data
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
      error: "No privacy policy link was found on this page."
    });
    return;
  }

  sendResponse({
    success: true,
    sourcePage: window.location.href,
    privacyUrl: privacyUrl
  });
});
