

// Initialize Google Sign-In when the script loads
function initializeGoogleSignIn() {
    try {
        google.accounts.id.initialize({
            client_id: '16218638873-e13qud162q6q342aqg8f0pu7pmgeu2bb.apps.googleusercontent.com',
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
        });
        
        const buttonDiv = document.getElementById('g_id_signin');
        if (buttonDiv) {
            google.accounts.id.renderButton(
                buttonDiv,
                { 
                    theme: 'outline',
                    size: 'large',
                    type: 'standard',
                    shape: 'pill',
                    text: 'signin_with',
                    logo_alignment: 'left'
                }
            );
        } else {
            console.error('Button container not found');
        }
    } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
    }
}


function handleCredentialResponse(response) {
    if (response.credential) {
        console.log('Received credential:', response.credential);
        fetch('/auth/google/callback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ credential: response.credential })
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    try {
                        const errorData = JSON.parse(text);
                        throw new Error(errorData.details || errorData.error || 'Authentication failed');
                    } catch (e) {
                        throw new Error(text || 'Authentication failed');
                    }
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Authentication successful:', data);
            if (data.status === 'success' && data.user) {
                const userInfo = document.getElementById('user-info');
                const userName = document.getElementById('user-name');
                const signInButton = document.getElementById('g_id_signin');
                
                if (userInfo && userName && signInButton) {
                    userInfo.style.display = 'flex';
                    userName.textContent = data.user.name || 'User';
                    signInButton.style.display = 'none';
                    console.log('User info updated after login');
                }
            }
        })
        .catch(error => {
            console.error('Authentication error:', error);
            alert('Authentication failed: ' + error.message);
        });
    } else {
        console.error('No credential received');
        alert('No credential received from Google');
    }
}
