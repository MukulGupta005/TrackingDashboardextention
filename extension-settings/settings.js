// Settings page JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    const input = document.getElementById('referralCode');
    const saveBtn = document.getElementById('saveBtn');
    const status = document.getElementById('status');
    const currentCodeDiv = document.getElementById('currentCode');
    const codeDisplay = document.getElementById('codeDisplay');

    // Load existing referral code
    const { referralCode } = await chrome.storage.local.get('referralCode');
    if (referralCode) {
        input.value = referralCode;
        codeDisplay.textContent = referralCode;
        currentCodeDiv.style.display = 'block';
    }

    // Save referral code
    saveBtn.addEventListener('click', async () => {
        const code = input.value.trim().toUpperCase();

        if (!code) {
            showStatus('Please enter a referral code', 'error');
            return;
        }

        if (code.length !== 8) {
            showStatus('Referral code must be 8 characters', 'error');
            return;
        }

        try {
            // Save to storage
            await chrome.storage.local.set({ referralCode: code });

            // Track this installation if not already tracked
            const { installId } = await chrome.storage.local.get('installId');
            if (!installId) {
                await trackInstallation(code);
            }

            codeDisplay.textContent = code;
            currentCodeDiv.style.display = 'block';
            showStatus('✅ Saved! Tracking is now active', 'success');
        } catch (error) {
            console.error('Save error:', error);
            showStatus('Failed to save. Try again.', 'error');
        }
    });

    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';

        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }

    async function trackInstallation(referralCode) {
        try {
            const response = await fetch('http://localhost:3000/api/track/install', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'connectez-api-key-for-extension-tracking-12345'
                },
                body: JSON.stringify({ referralCode })
            });

            const data = await response.json();
            if (response.ok) {
                await chrome.storage.local.set({ installId: data.installId });
                console.log('✅ Installation tracked:', data.installId);
            }
        } catch (error) {
            console.error('Tracking error:', error);
        }
    }
});
