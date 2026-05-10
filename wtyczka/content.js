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

const PHISHING_BLOCK_HOST_ID = "clearterms-phishing-block-screen";
let phishingBlockData = null;
let phishingBlockObserver = null;
let lastBlacklistCheckUrl = null;

function dismissPhishingBlockOverlay() {
  phishingBlockData = null;

  if (phishingBlockObserver) {
    phishingBlockObserver.disconnect();
    phishingBlockObserver = null;
  }

  const host = document.getElementById(PHISHING_BLOCK_HOST_ID);
  if (host) {
    host.remove();
  }

  document.documentElement.style.removeProperty("overflow");
  if (document.body) {
    document.body.style.removeProperty("overflow");
  }
}

function ensurePhishingBlockOverlay() {
  if (!phishingBlockData) return;

  let host = document.getElementById(PHISHING_BLOCK_HOST_ID);

  if (!host) {
    host = document.createElement("div");
    host.id = PHISHING_BLOCK_HOST_ID;
    host.style.setProperty("all", "initial", "important");
    host.style.setProperty("position", "fixed", "important");
    host.style.setProperty("inset", "0", "important");
    host.style.setProperty("z-index", "2147483647", "important");
    host.style.setProperty("display", "block", "important");

    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed !important;
          inset: 0 !important;
          z-index: 2147483647 !important;
          display: block !important;
        }

        .screen {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 32px;
          box-sizing: border-box;
          background:
            radial-gradient(circle at 50% 0%, rgba(248, 113, 113, 0.28), transparent 42%),
            linear-gradient(135deg, #260707, #07090f 64%);
          color: #fee2e2;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          text-align: center;
        }

        .panel {
          width: min(680px, 100%);
          padding: 34px;
          border: 1px solid rgba(248, 113, 113, 0.38);
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.78);
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.62);
        }

        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(185, 28, 28, 0.34);
          color: #fecaca;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          color: #fff1f2;
          font-size: clamp(34px, 7vw, 66px);
          line-height: 1;
          font-weight: 900;
        }

        p {
          margin: 18px auto 0;
          max-width: 520px;
          color: #fecaca;
          font-size: 18px;
          line-height: 1.5;
          font-weight: 600;
        }

        .meta {
          margin-top: 18px;
          color: #fca5a5;
          font-size: 13px;
          font-weight: 600;
          word-break: break-word;
        }

        .trust-button {
          position: fixed;
          right: 24px;
          bottom: 24px;
          min-height: 44px;
          padding: 0 18px;
          border: 1px solid rgba(254, 202, 202, 0.56);
          border-radius: 8px;
          background: rgba(255, 241, 242, 0.96);
          color: #7f1d1d;
          font-family: inherit;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.34);
        }

        .trust-button:hover {
          background: #ffffff;
        }

        .trust-button:focus-visible {
          outline: 3px solid rgba(254, 202, 202, 0.76);
          outline-offset: 3px;
        }

        @media (max-width: 520px) {
          .screen {
            padding: 20px;
          }

          .panel {
            padding: 26px 20px;
          }

          .trust-button {
            right: 16px;
            bottom: 16px;
          }
        }
      </style>
      <div class="screen" role="alert" aria-live="assertive">
        <section class="panel">
          <div class="badge">ClearTerms protection</div>
          <h1>Phishing site blocked</h1>
          <p>This page appears on the phishing blacklist and has been blocked to protect your data.</p>
          <div class="meta"></div>
        </section>
        <button type="button" class="trust-button">Zaufaj stronie</button>
      </div>
    `;

    root.querySelector(".trust-button")?.addEventListener("click", dismissPhishingBlockOverlay);
  }

  if (document.body && host.parentNode !== document.body) {
    document.body.appendChild(host);
  } else if (!document.body && document.documentElement && host.parentNode !== document.documentElement) {
    document.documentElement.appendChild(host);
  }

  document.documentElement.style.setProperty("overflow", "hidden", "important");
  if (document.body) {
    document.body.style.setProperty("overflow", "hidden", "important");
  }
}

function startPhishingBlockObserver() {
  if (phishingBlockObserver) return;

  phishingBlockObserver = new MutationObserver(() => {
    ensurePhishingBlockOverlay();
  });

  phishingBlockObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class"]
  });
}

async function checkCurrentPageAgainstPhishingBlacklist() {
  const currentUrl = window.location.href;
  if (currentUrl === lastBlacklistCheckUrl) return;

  lastBlacklistCheckUrl = currentUrl;

  try {
    const response = await chrome.runtime.sendMessage({
      action: "checkPhishingBlacklist",
      url: currentUrl
    });

    if (!response?.success || !response.blocked) return;

    phishingBlockData = response;
    ensurePhishingBlockOverlay();
    startPhishingBlockObserver();
  } catch (error) {
    console.warn("ClearTerms phishing blacklist check failed:", error);
  }
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

checkCurrentPageAgainstPhishingBlacklist();

setInterval(() => {
  checkCurrentPageAgainstPhishingBlacklist();
}, 1000);
