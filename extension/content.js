let hoverTimer = null;
let hideTimer = null;
const HOVER_DELAY = 300; // ms
const HIDE_DELAY = 500; // ms (Grace period for moving to tooltip)
const API_URL = "http://localhost:8000/predict";

let isHoveringLink = false;
let isHoveringTooltip = false;
const processedUrls = new Set();

// Listen for stats reset to clear the processed URLs cache
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.stats) {
        const newStats = changes.stats.newValue;
        // If stats were reset (threatsDetected is 0 and no recent threats)
        if (newStats && newStats.threatsDetected === 0 && (!newStats.recentThreats || newStats.recentThreats.length === 0)) {
            console.log("PhishHover: Stats reset detected, clearing processed URLs cache");
            processedUrls.clear();
        }
    }
});

// Create Tooltip Element
const tooltip = document.createElement("div");
tooltip.id = "phish-hover-tooltip";
document.body.appendChild(tooltip);

// Tooltip Interaction: Prevent hiding when mouse is over the tooltip
tooltip.addEventListener("mouseenter", () => {
    isHoveringTooltip = true;
    checkTooltipVisibility();
});

tooltip.addEventListener("mouseleave", () => {
    isHoveringTooltip = false;
    checkTooltipVisibility();
});

/**
 * Checks whether the tooltip should be hidden or stay visible
 */
function checkTooltipVisibility() {
    // If hovering (link OR tooltip), cancel hide timer
    if (isHoveringLink || isHoveringTooltip) {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    } else {
        // If not hovering either, start hide timer if not already running
        if (!hideTimer) {
            hideTimer = setTimeout(() => {
                // Double check state before hiding
                if (!isHoveringLink && !isHoveringTooltip) {
                    hideTooltip();
                }
            }, HIDE_DELAY);
        }
    }
}

/**
 * Positions and shows the tooltip near the mouse/element
 */
function showTooltip(x, y, data, targetUrl) {
    const isPhishing = data.label === "phishing";
    const riskClass = isPhishing ? "risk-danger" : "risk-safe";
    const riskText = isPhishing ? "HIGH RISK" : "SAFE";

    // Build HTML content
    let explanationsHtml = "";
    if (data.explanations && data.explanations.length > 0) {
        explanationsHtml = data.explanations.map(exp => `<div class="explanation">• ${exp}</div>`).join("");
    }

    let intentHtml = "";
    if (isPhishing) {
        intentHtml = `<div class="intent">⚠️ ${data.intent || "Unknown Threat"}</div>`;
    }

    const previewBtnHtml = isPhishing
        ? `<button id="phish-preview-btn" style="margin-top:8px; width:100%; padding:6px; background:#444; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px;">👁️ Safe Preview</button>`
        : `<button id="phish-preview-btn" style="margin-top:8px; width:100%; padding:6px; background:#eee; color:#333; border:none; border-radius:4px; cursor:pointer; font-size:11px;">👁️ Preview Link</button>`;

    tooltip.innerHTML = `
        <div class="header">
            <span class="title">PhishHover Analysis</span>
            <span class="risk-badge ${riskClass}">${riskText}</span>
        </div>
        <div class="content-section">
            ${intentHtml}
            ${explanationsHtml}
        </div>
        <div style="font-size: 10px; color: #999; margin-top: 4px; display:flex; justify-content:space-between; align-items:center;">
            <span>Risk Score: ${(data.risk_score * 100).toFixed(1)}%</span>
        </div>
        ${previewBtnHtml}
    `;

    // Attach Event Listener
    const btn = tooltip.querySelector("#phish-preview-btn");
    if (btn) {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openPreview(targetUrl);
            hideTooltip();
        });
    }

    // Position logic
    tooltip.style.left = `${x + 15}px`;
    tooltip.style.top = `${y + 15}px`;
    tooltip.classList.add("visible");
}

function hideTooltip() {
    tooltip.classList.remove("visible");
    hideTimer = null;
}


/**
 * Updates the stats in chrome.storage.local
 * Only tracks THREATS, not safe URLs
 */
function updateStats(data) {
    if (!chrome.storage) {
        console.error("PhishHover: chrome.storage API not available.");
        return;
    }

    // Only track threats, skip safe URLs
    if (data.label !== "phishing") {
        console.log("PhishHover: Safe URL, not tracking in stats:", data.url);
        return;
    }

    // Deduplication: Don't count the same URL twice in this session
    if (processedUrls.has(data.url)) {
        console.log("PhishHover: URL already processed, skipping stats update:", data.url);
        return;
    }
    processedUrls.add(data.url);

    chrome.storage.local.get(["stats"], (result) => {
        if (chrome.runtime.lastError) {
            console.error("PhishHover: Error getting stats:", chrome.runtime.lastError);
            return;
        }

        const stats = result.stats || {
            threatsDetected: 0,
            categories: {
                "Credential Theft": 0,
                "Malware Distribution": 0,
                "Social Engineering": 0,
                "General Suspicious Activity": 0
            },
            recentThreats: [],
            firstThreatDate: null,
            lastThreatDate: null
        };

        // Increment threat count
        stats.threatsDetected++;

        // Track by category
        const category = data.intent || "General Suspicious Activity";
        if (stats.categories[category] !== undefined) {
            stats.categories[category]++;
        } else {
            stats.categories[category] = 1;
        }

        // Track dates for analytics
        const now = new Date().toISOString();
        if (!stats.firstThreatDate) {
            stats.firstThreatDate = now;
        }
        stats.lastThreatDate = now;

        // Add to recent threats, keep last 20
        const threatItem = {
            url: data.url || "Unknown URL",
            category: data.intent || "General Suspicious Activity",
            riskScore: data.risk_score || 0,
            timestamp: now
        };
        stats.recentThreats.unshift(threatItem);
        if (stats.recentThreats.length > 20) stats.recentThreats.pop();

        console.log("PhishHover: Updating threat stats:", stats);

        chrome.storage.local.set({ stats }, () => {
            if (chrome.runtime.lastError) {
                console.error("PhishHover: Error saving stats:", chrome.runtime.lastError);
            } else {
                console.log("PhishHover: Threat stats saved successfully.");
            }
        });
    });
}

/**
 * Handles Hover Event
 */
document.addEventListener("mouseover", (event) => {
    const link = event.target.closest("a");

    if (!link || !link.href) return;

    isHoveringLink = true;
    checkTooltipVisibility();

    // Clear any pending show timer if we moved to a new link
    if (hoverTimer) clearTimeout(hoverTimer);

    hoverTimer = setTimeout(() => {
        console.log("PhishHover: Fetching prediction for URL:", link.href);
        fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: link.href })
        })
            .then(r => {
                console.log("PhishHover: Received response, status:", r.status);
                return r.json();
            })
            .then(data => {
                console.log("PhishHover: Parsed response data:", data);
                showTooltip(event.pageX, event.pageY, data, link.href);

                // Update Stats
                const statsData = { ...data, url: link.href };
                console.log("PhishHover: Calling updateStats with:", statsData);
                updateStats(statsData);
            })
            .catch(err => {
                console.error("PhishHover: Error in fetch chain:", err);
            });
    }, HOVER_DELAY);
});

/**
 * Handles Mouse Out
 */
document.addEventListener("mouseout", (event) => {
    const link = event.target.closest("a");
    if (!link) return;

    isHoveringLink = false;

    // Cancel pending show if user leaves quickly
    if (hoverTimer) clearTimeout(hoverTimer);

    checkTooltipVisibility();
});
/* =====================================================
   SAFE PREVIEW ENGINE
   ===================================================== */

let previewOverlay = null;

function openPreview(url) {
    if (previewOverlay) {
        previewOverlay.remove();
        previewOverlay = null;
    }

    previewOverlay = document.createElement("div");
    previewOverlay.style.position = "fixed";
    previewOverlay.style.top = "0";
    previewOverlay.style.left = "0";
    previewOverlay.style.width = "100%";
    previewOverlay.style.height = "100%";
    previewOverlay.style.background = "rgba(0,0,0,0.85)";
    previewOverlay.style.zIndex = "2147483647"; // Max z-index
    previewOverlay.style.display = "flex";
    previewOverlay.style.flexDirection = "column";
    previewOverlay.style.alignItems = "center";
    previewOverlay.style.justifyContent = "center";
    previewOverlay.style.backdropFilter = "blur(5px)";

    // Header
    const header = document.createElement("div");
    header.innerText = "⚠ Safe Preview Mode — Scripts Restricted";
    header.style.color = "white";
    header.style.fontSize = "16px";
    header.style.fontWeight = "bold";
    header.style.marginBottom = "15px";
    header.style.fontFamily = "system-ui, sans-serif";
    header.style.textShadow = "0 2px 4px rgba(0,0,0,0.5)";

    // Close Button
    const closeBtn = document.createElement("button");
    closeBtn.innerText = "✕ Close Preview";
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "20px";
    closeBtn.style.right = "20px";
    closeBtn.style.padding = "10px 16px";
    closeBtn.style.background = "#ff4444";
    closeBtn.style.color = "white";
    closeBtn.style.border = "none";
    closeBtn.style.borderRadius = "8px";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.fontWeight = "bold";
    closeBtn.style.fontSize = "14px";
    closeBtn.style.boxShadow = "0 4px 6px rgba(0,0,0,0.2)";

    closeBtn.onclick = closePreview;

    // Sandboxed Iframe
    const frame = document.createElement("iframe");
    frame.src = url;
    frame.style.width = "85%";
    frame.style.height = "80%";
    frame.style.border = "none";
    frame.style.borderRadius = "12px";
    frame.style.background = "white";
    frame.style.boxShadow = "0 20px 50px rgba(0,0,0,0.5)";

    // SECURITY: Sandbox attributes to disable scripts/forms/modals
    frame.sandbox = "allow-same-origin";

    previewOverlay.appendChild(header);
    previewOverlay.appendChild(closeBtn);
    previewOverlay.appendChild(frame);

    document.body.appendChild(previewOverlay);
}

function closePreview() {
    if (previewOverlay) {
        previewOverlay.remove();
        previewOverlay = null;
    }
}

// Exit on Escape key
document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        closePreview();
    }
});