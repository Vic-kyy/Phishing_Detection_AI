document.addEventListener("DOMContentLoaded", () => {
    console.log("PhishHover Panel: DOMContentLoaded event fired");
    console.log("PhishHover Panel: chrome.storage available:", !!chrome.storage);
    updateUI();

    // Listen for storage changes to update UI in real-time
    chrome.storage.onChanged.addListener((changes, namespace) => {
        console.log("PhishHover Panel: Storage changed!", { changes, namespace });
        if (namespace === "local" && changes.stats) {
            console.log("PhishHover Panel: Stats changed from", changes.stats.oldValue, "to", changes.stats.newValue);
            renderStats(changes.stats.newValue);
        }
    });

    // Reset Button Handler
    const resetBtn = document.getElementById("reset-btn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            console.log("PhishHover Panel: Reset button clicked");
            const emptyStats = {
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
            chrome.storage.local.set({ stats: emptyStats }, () => {
                console.log("PhishHover Panel: Stats reset complete");
                updateUI();
            });
        });
    }
});

function updateUI() {
    console.log("PhishHover Panel: updateUI called");
    chrome.storage.local.get(["stats"], (result) => {
        if (chrome.runtime.lastError) {
            console.error("PhishHover Panel: Error reading storage", chrome.runtime.lastError);
            return;
        }

        console.log("PhishHover Panel: Retrieved stats from storage:", result.stats);
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
        renderStats(stats);
    });
}

function renderStats(stats) {
    console.log("PhishHover Panel: renderStats called with:", stats);

    // Ensure categories exist
    if (!stats.categories) {
        stats.categories = {
            "Credential Theft": 0,
            "Malware Distribution": 0,
            "Social Engineering": 0,
            "General Suspicious Activity": 0
        };
    }

    // Main threat count
    document.getElementById("threats-count").innerText = stats.threatsDetected || 0;

    // Threat period
    const periodEl = document.getElementById("threat-period");
    if (stats.threatsDetected > 0 && stats.firstThreatDate) {
        const firstDate = new Date(stats.firstThreatDate);
        const lastDate = stats.lastThreatDate ? new Date(stats.lastThreatDate) : firstDate;
        const daysDiff = Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
            periodEl.innerText = "Detected today";
        } else {
            periodEl.innerText = `Over ${daysDiff} day${daysDiff > 1 ? 's' : ''}`;
        }
    } else {
        periodEl.innerText = "No threats detected yet";
    }

    // Analytics Insights
    const analyticsSection = document.getElementById("analytics-section");
    if (analyticsSection) {
        analyticsSection.innerHTML = "";

        if (stats.threatsDetected > 0) {
            // Find most common threat type
            let maxCategory = null;
            let maxCount = 0;
            Object.entries(stats.categories).forEach(([cat, count]) => {
                if (count > maxCount) {
                    maxCount = count;
                    maxCategory = cat;
                }
            });

            const insights = [];

            if (maxCategory && maxCount > 0) {
                const percentage = ((maxCount / stats.threatsDetected) * 100).toFixed(0);
                insights.push({
                    icon: "📊",
                    text: `${percentage}% of threats are ${maxCategory}`,
                    color: "#667eea"
                });
            }

            if (stats.recentThreats && stats.recentThreats.length > 0) {
                const avgRisk = (stats.recentThreats.reduce((sum, t) => sum + (t.riskScore || 0), 0) / stats.recentThreats.length * 100).toFixed(0);
                insights.push({
                    icon: "⚠️",
                    text: `Average risk score: ${avgRisk}%`,
                    color: "#f59e0b"
                });
            }

            if (stats.lastThreatDate) {
                const lastDate = new Date(stats.lastThreatDate);
                const now = new Date();
                const hoursSince = Math.floor((now - lastDate) / (1000 * 60 * 60));

                if (hoursSince < 1) {
                    insights.push({
                        icon: "🔴",
                        text: "Last threat detected less than 1 hour ago",
                        color: "#ef4444"
                    });
                } else if (hoursSince < 24) {
                    insights.push({
                        icon: "🟡",
                        text: `Last threat detected ${hoursSince} hour${hoursSince > 1 ? 's' : ''} ago`,
                        color: "#f59e0b"
                    });
                }
            }

            insights.forEach(insight => {
                const el = document.createElement("div");
                el.style.cssText = `
                    background: #f8f9fa;
                    padding: 10px;
                    border-radius: 6px;
                    margin-bottom: 8px;
                    border-left: 3px solid ${insight.color};
                    font-size: 11px;
                    color: #333;
                `;
                el.innerHTML = `<span style="margin-right: 6px;">${insight.icon}</span>${insight.text}`;
                analyticsSection.appendChild(el);
            });
        }
    }

    // Render Categories
    const categoriesList = document.getElementById("categories-list");
    if (categoriesList) {
        categoriesList.innerHTML = "";

        const categoryIcons = {
            "Credential Theft": "🔑",
            "Malware Distribution": "🦠",
            "Social Engineering": "🎭",
            "General Suspicious Activity": "⚠️"
        };

        Object.entries(stats.categories).forEach(([category, count]) => {
            const el = document.createElement("div");
            el.style.cssText = "display: flex; justify-content: space-between; padding: 4px 0; color: #666;";
            const icon = categoryIcons[category] || "⚠️";
            el.innerHTML = `
                <span>${icon} ${category}</span>
                <span style="font-weight: bold; color: ${count > 0 ? '#d32f2f' : '#999'};">${count}</span>
            `;
            categoriesList.appendChild(el);
        });
    }

    // Render Recent Threats
    const list = document.getElementById("recent-threats-list");
    if (list) {
        list.innerHTML = "";

        if (stats.recentThreats && stats.recentThreats.length > 0) {
            stats.recentThreats.forEach(threat => {
                const el = document.createElement("div");
                el.className = "scan-item";

                // Truncate URL
                let displayUrl = threat.url;
                try {
                    const u = new URL(threat.url);
                    displayUrl = u.hostname + (u.pathname.length > 1 ? u.pathname.substring(0, 15) + "..." : "");
                } catch (e) {
                    if (displayUrl.length > 30) displayUrl = displayUrl.substring(0, 30) + "...";
                }

                // Time ago
                const timeAgo = getTimeAgo(threat.timestamp);

                // Category badge
                const categoryBadge = threat.category ? `<div style="font-size: 9px; color: #888; margin-top: 2px;">${threat.category}</div>` : "";

                el.innerHTML = `
                    <div style="flex: 1;">
                        <div class="scan-url" title="${threat.url}">${displayUrl}</div>
                        ${categoryBadge}
                    </div>
                    <div style="text-align: right;">
                        <div class="scan-risk risk-high">THREAT</div>
                        <div style="font-size: 9px; color: #999; margin-top: 2px;">${timeAgo}</div>
                    </div>
                `;
                list.appendChild(el);
            });
        } else {
            list.innerHTML = `<div style="text-align:center; color:#999; font-size:11px; padding:10px;">No threats detected yet</div>`;
        }
    }
    console.log("PhishHover Panel: UI rendered successfully");
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
