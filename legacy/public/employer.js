// Employer Panel Logic

// Current user state
let currentUser = JSON.parse(localStorage.getItem('deploynix_user')) || null;
let userProfile = JSON.parse(localStorage.getItem('deploynix_profile')) || null;

document.addEventListener('DOMContentLoaded', () => {
    // Auth Guard
    if (!currentUser || currentUser.role !== 'employer') {
        window.location.href = 'index.html';
        return;
    }

    // Attempt to load profile from all profiles if userProfile isn't fully set
    const profiles = JSON.parse(localStorage.getItem('deploynix_profiles')) || {};
    const fullProfile = profiles[currentUser.email] || {};

    // Pre-fill company name
    const companyInput = document.getElementById('companyName');
    if (companyInput && (fullProfile.company || currentUser.company)) {
        companyInput.value = fullProfile.company || currentUser.company;
        companyInput.readOnly = true; // Lock the company name to what they registered with
        companyInput.style.backgroundColor = 'var(--dark-gray)';
    }
});

// Switch tabs
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');

    if (tabId === 'applications') {
        loadApplications();
    }
}

// Handle job posting
document.getElementById('postJobForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Posting...';
    submitBtn.disabled = true;

    // Collect form data into JSON
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/jobs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            alert('Job posted successfully! It is now live on the candidate portal.');
            e.target.reset();
        } else {
            alert(result.message || 'Error posting job.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Load applications from backend
async function loadApplications() {
    const tbody = document.getElementById('applicationsBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading applications...</td></tr>';

    try {
        const response = await fetch('/api/applications');
        const data = await response.json();

        if (data && data.applications && data.applications.length > 0) {
            renderApplications(data.applications.reverse()); // Show newest first
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px;">No applications received yet.</td></tr>';
        }
    } catch (error) {
        console.error('Error fetching applications:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #ff6b6b;">Error loading applications. Check your connection.</td></tr>';
    }
}

function renderApplications(apps) {
    const tbody = document.getElementById('applicationsBody');

    tbody.innerHTML = apps.map(app => {
        const d = new Date(app.appliedAt);
        const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
            <tr>
                <td>
                    <div style="font-weight: 500; color: var(--white);">${app.fullName}</div>
                    <div style="font-size: 0.85rem; color: var(--text-gray);">${app.email}</div>
                    <div style="font-size: 0.85rem; color: var(--text-gray);">${app.phone}</div>
                </td>
                <td>
                    <div style="color: var(--primary-red); font-weight: 500;">${app.jobTitle}</div>
                    <div style="font-size: 0.85rem; color: var(--text-gray);">${app.companyName}</div>
                </td>
                <td>${app.experience} yrs</td>
                <td>${dateStr}</td>
                <td><span class="status-badge status-new">NEW</span></td>
                <td>
                    <a href="/api/resume/${app.resume.filename}" class="action-link" target="_blank" download>
                        <i class="fas fa-file-download" style="margin-right:5px;"></i>Resume
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}
