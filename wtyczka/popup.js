const scanBtn = document.getElementById("scanBtn");
const statusDiv = document.getElementById("status");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const scanPanel = document.getElementById("scanPanel");
const accountDiv = document.getElementById("account");
const logoutBtn = document.getElementById("logoutBtn");
const companyInfoBtn = document.getElementById("companyInfoBtn");
const companyInfoPanel = document.getElementById("companyInfoPanel");

// Helpers to render formatted status safely
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatStatusHtml(text) {
  if (text == null) return "";
  let html = escapeHtml(text);

  // preserve line breaks
  html = html.replace(/\r\n|\r|\n/g, "<br>");

  // Highlight section headings and put their content on the next line
  html = html.replace(/\b(User tip|Educational note):(?:<br>)?/gi, function(m, heading) {
    return '<span class="status-heading">' + heading + ':</span><br>';
  });

  // Highlight Score: XX/100 (allow optional line break between Score: and the number)
  html = html.replace(/Score:\s*(?:<br>\s*)?([0-9]{1,3}\/100)/gi, function(_, p1) {
    const score = Number(p1.split("/")[0]);
    let scoreClass = "score--safe";
    if (score < 30) scoreClass = "score--danger";
    else if (score < 50) scoreClass = "score--orange";
    else if (score < 70) scoreClass = "score--yellow";

    return 'Score: <span class="score ' + scoreClass + '">' + p1 + '</span>';
  });

  // Highlight verdict words
  html = html.replace(/\b(dangerous|phishing|suspicious|safe)\b/gi, function(m) {
    const verdictClass = m.toLowerCase() === "safe" ? "verdict--safe"
      : m.toLowerCase() === "suspicious" ? "verdict--orange"
      : "verdict--danger";

    return '<span class="verdict ' + verdictClass + '">' + m + '</span>';
  });

  return html;
}

function setStatusText(text) {
  statusDiv.innerHTML = formatStatusHtml(text);
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginBtn.disabled = true;

  try {
    setStatusText("Loggin in...");

    const response = await chrome.runtime.sendMessage({
      action: "login",
      data: {
        email: emailInput.value,
        password: passwordInput.value
      }
    });

    if (!response || !response.success) {
      setStatusText(response?.error || "Failed to log in.");
      return;
    }

    passwordInput.value = "";
    await refreshAuthState();
    setStatusText("Successfull logged in.");
  } catch (error) {
    console.error(error);
    setStatusText("Error: " + error.message);
  } finally {
    loginBtn.disabled = false;
  }
});

scanBtn.addEventListener("click", async () => {
  scanBtn.disabled = true;

  try {
    setStatusText("Searching for a privacy policy.");

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab || !tab.id) {
      setStatusText("Unable to read the active tab.");
      return;
    }

    if (
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("edge://") ||
      tab.url.startsWith("brave://") ||
      tab.url.startsWith("about:")
    ) {
      setStatusText("This extension cannot run on this page. Open a regular website.");
      return;
    }

    let found;

    try {
      found = await chrome.tabs.sendMessage(tab.id, {
        action: "findPrivacyPolicy"
      });
    } catch (error) {
      console.log("Content script was not active. Injecting content.js...");

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });

      found = await chrome.tabs.sendMessage(tab.id, {
        action: "findPrivacyPolicy"
      });
    }

    if (!found || !found.success) {
      setStatusText(found?.error || "No privacy policy was found.");
      return;
    }

    setStatusText("Privacy policy found:\n" + found.privacyUrl + "\n\nChecking the backend and starting analysis...");

    const response = await chrome.runtime.sendMessage({
      action: "startAnalyzeJob",
      data: {
        sourcePage: found.sourcePage,
        privacyUrl: found.privacyUrl
      }
    });

    if (!response || !response.success) {
      setStatusText(response?.error || "Analysis failed, try again in a few seconds.");
      return;
    }

    setStatusText("Analysis ongoing.\n");
  } catch (error) {
    console.error(error);
    setStatusText("Error: " + error.message);
  } finally {
    scanBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  logoutBtn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: "logout"
    });

    if (!response || !response.success) {
      setStatusText(response?.error || "Unable to log out.");
      return;
    }

    await refreshAuthState();
  } catch (error) {
    console.error(error);
    setStatusText("Error: " + error.message);
  } finally {
    logoutBtn.disabled = false;
  }
});

companyInfoBtn.addEventListener("click", () => {
  const willShow = companyInfoPanel.classList.contains("hidden");
  companyInfoPanel.classList.toggle("hidden", !willShow);
  companyInfoBtn.textContent = willShow ? "Hide company info" : "Company info";
});

async function refreshStatus() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  const data = await chrome.storage.local.get([
    "analyzeStatus",
    "analyzeStatusPage"
  ]);

  if (data.analyzeStatus && data.analyzeStatusPage === tab?.url) {
    setStatusText(data.analyzeStatus);
  }
}

async function refreshAuthState() {
  const auth = await chrome.runtime.sendMessage({
    action: "getAuthState"
  });

  const loggedIn = Boolean(auth?.loggedIn);

  loginForm.classList.toggle("hidden", loggedIn);
  scanPanel.classList.toggle("hidden", !loggedIn);
  accountDiv.textContent = loggedIn ? "Signed in as " + auth.email : "";
}

refreshAuthState();
refreshStatus();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  if (
    changes.accessToken ||
    changes.refreshToken ||
    changes.tokenExpiresAt ||
    changes.userEmail
  ) {
    refreshAuthState();
  }

  if (changes.analyzeStatus) {
    setStatusText(changes.analyzeStatus.newValue);
  }
});
