const scanBtn = document.getElementById("scanBtn");
const statusDiv = document.getElementById("status");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const scanPanel = document.getElementById("scanPanel");
const accountDiv = document.getElementById("account");
const logoutBtn = document.getElementById("logoutBtn");

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginBtn.disabled = true;

  try {
    statusDiv.textContent = "Loggin in...";

    const response = await chrome.runtime.sendMessage({
      action: "login",
      data: {
        email: emailInput.value,
        password: passwordInput.value
      }
    });

    if (!response || !response.success) {
      statusDiv.textContent = response?.error || "Failed to log in.";
      return;
    }

    passwordInput.value = "";
    await refreshAuthState();
    statusDiv.textContent = "Successfull logged in.";
  } catch (error) {
    console.error(error);
    statusDiv.textContent = "Error: " + error.message;
  } finally {
    loginBtn.disabled = false;
  }
});

scanBtn.addEventListener("click", async () => {
  scanBtn.disabled = true;

  try {
    statusDiv.textContent = "Searching for a privacy policy.";

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab || !tab.id) {
      statusDiv.textContent = "Unable to read the active tab.";
      return;
    }

    if (
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("edge://") ||
      tab.url.startsWith("brave://") ||
      tab.url.startsWith("about:")
    ) {
      statusDiv.textContent = "This extension cannot run on this page. Open a regular website.";
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
      statusDiv.textContent = found?.error || "No privacy policy was found.";
      return;
    }

    statusDiv.textContent = "Privacy policy found:\n" + found.privacyUrl + "\n\nChecking the backend and starting analysis...";

    const response = await chrome.runtime.sendMessage({
      action: "startAnalyzeJob",
      data: {
        sourcePage: found.sourcePage,
        privacyUrl: found.privacyUrl
      }
    });

    if (!response || !response.success) {
      statusDiv.textContent = response?.error || "Analysis failed, try again in a few seconds.";
      return;
    }

    statusDiv.textContent =
      "Analysis ongoing.\n";
  } catch (error) {
    console.error(error);
    statusDiv.textContent = "Error: " + error.message;
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
      statusDiv.textContent = response?.error || "Unable to log out.";
      return;
    }

    await refreshAuthState();
  } catch (error) {
    console.error(error);
    statusDiv.textContent = "Error: " + error.message;
  } finally {
    logoutBtn.disabled = false;
  }
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
    statusDiv.textContent = data.analyzeStatus;
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
    statusDiv.textContent = changes.analyzeStatus.newValue;
  }
});
