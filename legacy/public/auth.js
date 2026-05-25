// auth.js - Handles login, register, and Gmail login for auth.html

document.addEventListener('DOMContentLoaded', () => {
    const formTitle = document.getElementById('form-title');
    const authForm = document.getElementById('auth-form');
    const submitBtn = document.getElementById('submit-btn');
    const toggleLink = document.getElementById('toggle-link');
    const googleBtn = document.getElementById('google-login');
    const companyInput = document.getElementById('company');
    const companyGroup = document.getElementById('companyGroup');
    const fullNameInput = document.getElementById('fullName');
    const fullNameGroup = document.getElementById('fullNameGroup');
    const phoneInput = document.getElementById('phone');
    const phoneGroup = document.getElementById('phoneGroup');

    // OTP Elements
    const otpSection = document.getElementById('otpSection');
    const otpInput = document.getElementById('otpInput');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const cancelOtpBtn = document.getElementById('cancelOtpBtn');

    let simulatedOtp = null;
    let pendingRegistration = null;

    // Determine role from URL
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role') === 'employer' ? 'employer' : 'candidate';

    let isLogin = true;

    // Set initial title
    formTitle.textContent = role === 'employer' ? 'Employer Login' : 'Candidate Login';

    toggleLink.addEventListener('click', () => {
        isLogin = !isLogin;

        if (isLogin) {
            formTitle.textContent = role === 'employer' ? 'Employer Login' : 'Candidate Login';
            submitBtn.textContent = 'Login';
            toggleLink.textContent = "Don't have an account? Register";
            companyGroup.style.display = 'none';
            companyInput.required = false;

            fullNameGroup.style.display = 'none';
            fullNameInput.required = false;
            phoneGroup.style.display = 'none';
            phoneInput.required = false;
        } else {
            formTitle.textContent = role === 'employer' ? 'Employer Registration' : 'Candidate Registration';
            submitBtn.textContent = 'Register';
            toggleLink.textContent = 'Already have an account? Login';

            // Show company field if registering as employer
            if (role === 'employer') {
                companyGroup.style.display = 'block';
                companyInput.required = true;

                fullNameGroup.style.display = 'none';
                fullNameInput.required = false;
                phoneGroup.style.display = 'none';
                phoneInput.required = false;
            } else {
                companyGroup.style.display = 'none';
                companyInput.required = false;

                fullNameGroup.style.display = 'block';
                fullNameInput.required = true;
                phoneGroup.style.display = 'block';
                phoneInput.required = true;
            }
        }
    });

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const company = companyInput.value;

        const users = JSON.parse(localStorage.getItem('deploynix_users')) || [];

        if (isLogin) {
            // Login logic
            const user = users.find(u => u.email === email && u.password === password && u.role === role);
            if (user) {
                localStorage.setItem('deploynix_user', JSON.stringify(user));
                alert('Login successful!');
                window.location.href = role === 'employer' ? 'employer.html' : 'candidate.html';
            } else {
                alert('Invalid email, password, or account role.');
            }
        } else {
            // Register logic
            if (users.find(u => u.email === email)) {
                alert('Email already registered.');
                return;
            }

            const newUser = { email, password, role };

            if (role === 'candidate') {
                // Trigger OTP Flow instead of saving immediately
                newUser.firstName = fullNameInput.value.split(' ')[0] || '';
                newUser.lastName = fullNameInput.value.split(' ').slice(1).join(' ') || '';
                newUser.phone = phoneInput.value;

                pendingRegistration = newUser;
                simulatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

                // Hide main form components, show OTP
                authForm.style.display = 'none';
                document.getElementById('google-login').style.display = 'none';
                document.querySelector('.divider').style.display = 'none';
                toggleLink.style.display = 'none';
                formTitle.textContent = 'Verify Phone Number';

                otpSection.style.display = 'block';
                otpInput.value = '';
                otpInput.focus();

                setTimeout(() => {
                    alert(`SIMULATED SMS to ${newUser.phone}:\n\nYour Deploynix verification OTP is: ${simulatedOtp}`);
                }, 500);

                return; // Stop here until OTP is verified
            } else if (role === 'employer') {
                newUser.company = company;
                // Pre-fill employer profile info
                const profiles = JSON.parse(localStorage.getItem('deploynix_profiles')) || {};
                profiles[email] = { company: company, role: role };
                localStorage.setItem('deploynix_profiles', JSON.stringify(profiles));
            }

            finalizeRegistration(newUser, users);
        }
    });

    // OTP Verification Handlers
    verifyOtpBtn.addEventListener('click', () => {
        if (!pendingRegistration) return;

        if (otpInput.value === simulatedOtp) {
            const users = JSON.parse(localStorage.getItem('deploynix_users')) || [];

            // Save candidate profile
            const profiles = JSON.parse(localStorage.getItem('deploynix_profiles')) || {};
            profiles[pendingRegistration.email] = {
                firstName: pendingRegistration.firstName,
                lastName: pendingRegistration.lastName,
                phone: pendingRegistration.phone,
                role: 'candidate'
            };
            localStorage.setItem('deploynix_profiles', JSON.stringify(profiles));

            finalizeRegistration(pendingRegistration, users);
        } else {
            alert('Invalid OTP. Please try again.');
        }
    });

    cancelOtpBtn.addEventListener('click', () => {
        pendingRegistration = null;
        simulatedOtp = null;

        // Restore UI
        otpSection.style.display = 'none';
        authForm.style.display = 'flex';
        document.getElementById('google-login').style.display = 'flex';
        document.querySelector('.divider').style.display = 'flex';
        toggleLink.style.display = 'block';
        formTitle.textContent = role === 'employer' ? 'Employer Registration' : 'Candidate Registration';
    });

    function finalizeRegistration(newUser, users) {
        users.push(newUser);
        localStorage.setItem('deploynix_users', JSON.stringify(users));
        localStorage.setItem('deploynix_user', JSON.stringify(newUser));

        alert('Registration successful!');
        window.location.href = newUser.role === 'employer' ? 'employer.html' : 'candidate.html';
    }

    googleBtn.addEventListener('click', () => {
        alert('Gmail login is not implemented in this demo.');
    });
});
