// Options page JavaScript
const DASHBOARD_API = 'https://trackingdashboardextention.onrender.com';
const API_KEY = 'connectez-api-key-for-extension-tracking-12345';

document.addEventListener('DOMContentLoaded', async () => {
    const input = document.getElementById('referralCode');
    const saveBtn = document.getElementById('saveBtn');
    const btnText = document.getElementById('btnText');
    const message = document.getElementById('message');
    const currentCodeBox = document.getElementById('currentCodeBox');
    const currentCodeValue = document.getElementById('currentCodeValue');
    const statsBox = document.getElementById('statsBox');

    // Load existing data
    await loadCurrentSettings();

    // Save button handler
    saveBtn.addEventListener('click', async () => {
        const code = input.value.trim().toUpperCase();

        if (!code) {
            showMessage('Please enter a referral code', 'error');
            return;
        }

        if (code.length !== 8) {
            showMessage('Referral code must be 8 characters', 'error');
            return;
        }

        // Disable button
        saveBtn.disabled = true;
        btnText.textContent = 'Saving...';

        try {
            // Save to storage
            await chrome.storage.local.set({ referralCode: code });

            // Track installation if not already tracked
            const { installId } = await chrome.storage.local.get('installId');
            if (!installId) {
                await trackInstallation(code);
            }

            // Update UI
            currentCodeValue.textContent = code;
            currentCodeBox.classList.add('show');
            statsBox.classList.add('show');

            showMessage('✅ Tracking enabled! Dashboard will update in real-time', 'success');

            // Update tracking status
            await updateTrackingStatus();

            // Clear input
            input.value = '';

        } catch (error) {
            console.error('Save error:', error);
            showMessage(`Tracking Failed: ${error.message}`, 'error');
        } finally {
            saveBtn.disabled = false;
            btnText.textContent = 'Save & Enable Tracking';
        }
    });

    // Enter key handler
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveBtn.click();
        }
    });

    async function loadCurrentSettings() {
        const data = await chrome.storage.local.get(['referralCode', 'installId']);

        if (data.referralCode) {
            currentCodeValue.textContent = data.referralCode;
            currentCodeBox.classList.add('show');
            statsBox.classList.add('show');
            input.value = data.referralCode;
            await updateTrackingStatus();
        }
    }

    async function updateTrackingStatus() {
        const data = await chrome.storage.local.get(['installId', 'mellowtelTracked']);

        document.getElementById('installStatus').textContent =
            data.installId ? 'Yes ✓' : 'No';

        document.getElementById('mellowtelStatus').textContent =
            data.mellowtelTracked ? 'Active ✓' : 'Inactive';

        document.getElementById('activityStatus').textContent =
            data.installId ? 'Active ✓' : 'Inactive';
    }

    async function trackInstallation(referralCode) {
        try {
            const installId = crypto.randomUUID();
            const response = await fetch(`${DASHBOARD_API}/api/track/install`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                body: JSON.stringify({ referralCode, installId })
            });

            const data = await response.json();

            if (response.ok) {
                await chrome.storage.local.set({ installId: data.installId });
                console.log('✅ Installation tracked:', data.installId);
                return data.installId;
            } else {
                // Return server error
                throw new Error(data.error || `Server Error: ${response.status}`);
            }
        } catch (error) {
            console.error('Tracking error:', error);
            // Throw specific error for UI
            throw new Error(error.message || 'Connection failed');
        }
    }

    function showMessage(text, type) {
        message.textContent = text;
        message.className = `message ${type} show`;

        setTimeout(() => {
            message.classList.remove('show');
        }, 5000);
    }
});
