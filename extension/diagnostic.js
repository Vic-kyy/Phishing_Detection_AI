// PhishHover Diagnostic Script
// Copy and paste this into the browser console (F12) on any page to test

console.log("=== PhishHover Diagnostic Test ===");

// Test 1: Check if chrome.storage is available
console.log("1. Chrome Storage API available:", !!chrome?.storage);

// Test 2: Read current stats
chrome.storage.local.get(["stats"], (result) => {
    console.log("2. Current stats in storage:", result.stats);
});

// Test 3: Manually write test stats
const testStats = {
    scanned: 999,
    threats: 99,
    safe: 900,
    categories: {
        "Credential Theft": 10,
        "Malware Distribution": 20,
        "Social Engineering": 30,
        "General Suspicious Activity": 39
    },
    recent: [
        {
            url: "https://diagnostic-test.com",
            risk: "High Risk",
            category: "Credential Theft",
            timestamp: new Date().toISOString()
        }
    ]
};

console.log("3. Writing test stats:", testStats);
chrome.storage.local.set({ stats: testStats }, () => {
    console.log("4. Test stats written successfully");

    // Verify it was saved
    chrome.storage.local.get(["stats"], (result) => {
        console.log("5. Verification - stats after write:", result.stats);
        console.log("6. Stats match:", JSON.stringify(result.stats) === JSON.stringify(testStats));
    });
});

console.log("=== Check the Side Panel - it should update to show 999 scanned ===");
