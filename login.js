document.addEventListener('DOMContentLoaded', async () => {
    // Use a relative URL for portability
    const API_BASE_URL = '/api/admin';

    const loginForm = document.getElementById('login-form');
    const pageTitle = document.querySelector('.section-title');
    const confirmPasswordGroup = document.getElementById('confirm-password-group');
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    let isSetupMode = false;

    
    // Check with the server if an admin account exists
    try {
        const response = await fetch(`${API_BASE_URL}/exists`);
        const data = await response.json();
        isSetupMode = !data.exists;
        
        if (isSetupMode) {
            // --- SETUP MODE ---
            pageTitle.textContent = 'Create Admin Account';
            submitButton.textContent = 'Create Account';
            confirmPasswordGroup.style.display = 'block';
            // The input is already in the HTML, just needs to be shown
        } else {
            // --- LOGIN MODE ---
            // The "Forgot Password" link is a security risk and has been removed.
            // A proper implementation would involve email verification.
            forgotPasswordLink.style.display = 'none'; 
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
        alert('Could not connect to the server. Please ensure it is running.');
        submitButton.disabled = true;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (isSetupMode) {
            // --- Handle Account Creation ---
            const success = await handleSetup(username, password);
            if (!success) {
                // Re-enable button if setup fails
                submitButton.disabled = false;
                submitButton.textContent = 'Create Account';
            }
        } else {
            // --- Handle Login ---
            const success = await handleLogin(username, password);
            if (!success) {
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
            }
        }
    });

    async function handleSetup(username, password) {
        const confirmPassword = document.getElementById('confirm-password').value.trim();
        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return false;
        }
        if (password.length < 6) {
            alert('Password must be at least 6 characters long.');
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/setup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!response.ok) throw new Error(await response.text());
            
            alert('Admin account created successfully! You will be redirected to the login page.');
            window.location.reload(); // Reload to switch to login mode
        } catch (error) {
            console.error('Setup failed:', error);
            alert('Failed to create admin account.');
            return false;
        }
    }

    async function handleLogin(username, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!response.ok) throw new Error('Invalid credentials');
            
            window.location.href = 'admin.html';
            return true; // Explicitly return true on success
        } catch (error) {
            alert('Invalid credentials. Please try again.');
            return false;
        }
    }
});