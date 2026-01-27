// 🛠️ FORCE TRACK OPT-IN DEBUG SCRIPT
// Run this in the EXTENSION SERVICE WORKER CONSOLE

(async function forceTrackOptIn() {
    console.log("🚀 STARTING FORCE TRACKING...");

    // 1. Get current storage
    const storage = await chrome.storage.local.get(null);
    console.log("📂 Current Storage:", storage);

    const referralCode = storage.referralCode;
    const installId = storage.installId;

    if (!referralCode || !installId) {
        console.error("❌ ERROR: Missing referralCode or installId. Please save settings first.");
        return;
    }

    // 2. Check Mellowtel Status
    let isOptedIn = false;
    try {
        if (typeof mellowtel !== 'undefined') {
            isOptedIn = await mellowtel.getOptInStatus();
            console.log("🔍 Mellowtel.getOptInStatus():", isOptedIn);
        } else {
            console.warn("⚠️ 'mellowtel' object not found in global scope. Is it initialized?");
        }
    } catch (e) {
        console.error("⚠️ Error checking Mellowtel status:", e);
    }

    // 3. FORCE TRACK to Server (Bypass Mellowtel check for testing)
    console.log("📤 Sending FORCE tracking request to server...");

    try {
        const response = await fetch('http://localhost:3000/api/track/mellowtel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'connectez-api-key-for-extension-tracking-12345'
            },
            body: JSON.stringify({
                referralCode: referralCode,
                installId: installId
            })
        });

        console.log("📡 Server Response Status:", response.status);

        const data = await response.json();
        console.log("📄 Server Response Data:", data);

        if (response.ok) {
            console.log("✅ SUCCESS: Server accepted the opt-in tracking.");
            // Mark as tracked locally
            await chrome.storage.local.set({ mellowtelTracked: true });
            console.log("💾 Updated local storage: mellowtelTracked = true");
            console.log("🎉 CHECK DASHBOARD NOW!");
        } else {
            console.error("❌ SERVER REJECTED:", data.error || data);
        }

    } catch (networkError) {
        console.error("❌ NETWORK ERROR: Is the server running at http://localhost:3000?", networkError);
    }

})();
