// Job Listings Data
let jobs = [];

// Current user state
let currentUser = JSON.parse(localStorage.getItem('deploynix_user')) || null;
let userProfile = JSON.parse(localStorage.getItem('deploynix_profile')) || null;

// DOM Elements
const jobsGrid = document.getElementById('jobsGrid');
const searchInput = document.getElementById('searchInput');
const roleFilter = document.getElementById('roleFilter');
const experienceFilter = document.getElementById('experienceFilter');
const salaryFilter = document.getElementById('salaryFilter');
const locationFilter = document.getElementById('locationFilter');
const typeFilter = document.getElementById('typeFilter');
const sortFilter = document.getElementById('sortFilter');
const resultsCount = document.getElementById('resultsCount');
const applicationModal = document.getElementById('applicationModal');
const successModal = document.getElementById('successModal');
const authModal = document.getElementById('authModal');
const profileModal = document.getElementById('profileModal');
const applicationForm = document.getElementById('applicationForm');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const resumeInput = document.getElementById('resume');
const fileNameDisplay = document.getElementById('fileName');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Auth Guard
    if (!currentUser || currentUser.role !== 'candidate') {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch('/api/jobs');
        const data = await response.json();
        if (data && data.jobs) {
            jobs = data.jobs;
        }
    } catch (error) {
        console.error('Error fetching jobs:', error);
    }

    renderJobs(jobs);
    setupEventListeners();
    updateAuthUI();
    loadProfileData();
});

// Render Jobs
function renderJobs(jobsToRender) {
    if (jobsToRender.length === 0) {
        jobsGrid.innerHTML = `
            <div class="no-jobs">
                <i class="fas fa-search"></i>
                <h3>No jobs found</h3>
                <p>Try adjusting your search criteria</p>
            </div>
        `;
        resultsCount.textContent = '0 jobs found';
        return;
    }

    resultsCount.textContent = `${jobsToRender.length} job${jobsToRender.length !== 1 ? 's' : ''} found`;

    jobsGrid.innerHTML = jobsToRender.map(job => `
        <div class="job-card" data-id="${job.id}">
            <div class="job-header">
                <h3 class="job-title">${job.title}</h3>
                <span class="job-badge">${job.type.replace('-', ' ')}</span>
            </div>
            <p class="job-company">${job.company}</p>
            <div class="job-meta">
                <div class="job-meta-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${formatLocation(job.location)}</span>
                </div>
                <div class="job-meta-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>${job.salary}</span>
                </div>
                <div class="job-meta-item">
                    <i class="fas fa-clock"></i>
                    <span>${job.posted}</span>
                </div>
            </div>
            <p class="job-description">${job.description}</p>
            <div class="job-tags">
                ${job.tags.map(tag => `<span class="job-tag">${tag}</span>`).join('')}
            </div>
            <div class="job-actions">
                <button class="btn-apply" onclick="openApplicationModal(${job.id})">Apply Now</button>
                <button class="btn-details" onclick="showJobDetails(${job.id})">Details</button>
            </div>
        </div>
    `).join('');
}

function formatLocation(location) {
    const locationMap = {
        'remote': 'Remote',
        'hybrid': 'Hybrid',
        'on-site': 'On-site'
    };
    return locationMap[location] || location;
}

// Setup Event Listeners
function setupEventListeners() {
    // Search and Filter
    searchInput.addEventListener('input', filterJobs);
    roleFilter.addEventListener('change', filterJobs);
    experienceFilter.addEventListener('change', filterJobs);
    salaryFilter.addEventListener('change', filterJobs);
    locationFilter.addEventListener('change', filterJobs);
    typeFilter.addEventListener('change', filterJobs);
    sortFilter.addEventListener('change', filterJobs);

    // Close Modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('active');
        });
    });

    // Close modal on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // File Upload Display
    if (resumeInput) {
        resumeInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                fileNameDisplay.textContent = file.name;
            } else {
                fileNameDisplay.textContent = '';
            }
        });
    }

    // Profile Resume Upload
    const profileResume = document.getElementById('profileResume');
    if (profileResume) {
        profileResume.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const fileName = document.getElementById('profileFileName');
            if (file && fileName) {
                fileName.textContent = file.name;
            }
        });
    }

    // Form Submission
    applicationForm.addEventListener('submit', handleFormSubmit);

    // Mobile Navigation
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    // Close mobile nav on link click
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
}

// Filter Jobs
function filterJobs() {
    const searchTerm = searchInput.value.toLowerCase();
    const role = roleFilter.value;
    const experience = experienceFilter.value;
    const salary = salaryFilter.value;
    const location = locationFilter.value;
    const type = typeFilter.value;
    const sort = sortFilter.value;

    let filtered = jobs.filter(job => {
        // Search match
        const matchesSearch = !searchTerm ||
            job.title.toLowerCase().includes(searchTerm) ||
            job.description.toLowerCase().includes(searchTerm) ||
            job.company.toLowerCase().includes(searchTerm) ||
            job.tags.some(tag => tag.toLowerCase().includes(searchTerm));

        // Role match
        const matchesRole = !role || job.role === role;

        // Experience match
        const matchesExperience = !experience || matchExperience(job.experienceYears, experience);

        // Salary match
        const matchesSalary = !salary || matchSalary(job.salaryMin, salary);

        // Location match
        const matchesLocation = !location || job.location === location;

        // Type match
        const matchesType = !type || job.type === type;

        return matchesSearch && matchesRole && matchesExperience && matchesSalary && matchesLocation && matchesType;
    });

    // Sort results
    filtered = sortJobs(filtered, sort);

    renderJobs(filtered);
}

function matchExperience(jobExp, filter) {
    switch (filter) {
        case '0-1': return jobExp <= 1;
        case '1-3': return jobExp >= 1 && jobExp <= 3;
        case '3-5': return jobExp >= 3 && jobExp <= 5;
        case '5-10': return jobExp >= 5 && jobExp <= 10;
        case '10+': return jobExp >= 10;
        default: return true;
    }
}

function matchSalary(salaryMin, filter) {
    switch (filter) {
        case '0-50': return salaryMin <= 50;
        case '50-80': return salaryMin >= 50 && salaryMin <= 80;
        case '80-100': return salaryMin >= 80 && salaryMin <= 100;
        case '100-150': return salaryMin >= 100 && salaryMin <= 150;
        case '150+': return salaryMin >= 150;
        default: return true;
    }
}

function sortJobs(jobsList, sortBy) {
    switch (sortBy) {
        case 'date':
            return [...jobsList].sort((a, b) => a.postedDays - b.postedDays);
        case 'salary-high':
            return [...jobsList].sort((a, b) => b.salaryMin - a.salaryMin);
        case 'salary-low':
            return [...jobsList].sort((a, b) => a.salaryMin - b.salaryMin);
        default: // relevance
            return jobsList;
    }
}

function clearFilters() {
    searchInput.value = '';
    roleFilter.value = '';
    experienceFilter.value = '';
    salaryFilter.value = '';
    locationFilter.value = '';
    typeFilter.value = '';
    sortFilter.value = 'relevance';
    filterJobs();
}

// Open Application Modal
function openApplicationModal(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
        document.getElementById('modalJobTitle').textContent = job.title;
        document.getElementById('modalCompany').textContent = job.company;
        document.getElementById('jobId').value = job.id;
        document.getElementById('jobTitle').value = job.title;
        document.getElementById('companyName').value = job.company;

        // Pre-fill form if user is logged in
        if (currentUser && userProfile) {
            document.getElementById('fullName').value = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim();
            document.getElementById('email').value = currentUser.email || '';
            document.getElementById('phone').value = userProfile.phone || '';
            document.getElementById('linkedin').value = userProfile.linkedin || '';
            document.getElementById('portfolio').value = userProfile.portfolio || '';
            document.getElementById('experience').value = userProfile.experience || '';
        }

        fileNameDisplay.textContent = '';
        applicationModal.classList.add('active');
    }
}

// Show Job Details
function showJobDetails(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
        alert(`
Job: ${job.title}
Company: ${job.company}
Type: ${job.type}
Location: ${formatLocation(job.location)}
Salary: ${job.salary}
Experience Required: ${job.experience} years

${job.description}

Skills: ${job.tags.join(', ')}
        `);
    }
}

// Handle Form Submit
async function handleFormSubmit(e) {
    e.preventDefault();

    const submitBtn = applicationForm.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    const formData = new FormData(applicationForm);

    try {
        const response = await fetch('/api/apply', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            applicationModal.classList.remove('active');
            successModal.classList.add('active');
            applicationForm.reset();
            fileNameDisplay.textContent = '';
        } else {
            alert(result.message || 'Something went wrong. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please check your connection and try again.');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

// Close Success Modal
function closeSuccessModal() {
    successModal.classList.remove('active');
}

// ==================== AUTH FUNCTIONS ====================

function openAuthModal(type) {
    authModal.classList.add('active');
    switchAuthForm(type);
}

function closeAuthModal() {
    authModal.classList.remove('active');
}

function switchAuthForm(type) {
    const signinForm = document.getElementById('signinForm');
    const signupForm = document.getElementById('signupForm');

    if (type === 'signin') {
        signinForm.classList.add('active');
        signupForm.classList.remove('active');
    } else {
        signinForm.classList.remove('active');
        signupForm.classList.add('active');
    }
}

function handleSignIn(e) {
    e.preventDefault();
    const email = document.getElementById('signinEmail').value;
    const password = document.getElementById('signinPassword').value;

    // Simple local auth (in production, this would be server-side)
    const users = JSON.parse(localStorage.getItem('deploynix_users')) || [];
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        currentUser = { email: user.email, firstName: user.firstName, lastName: user.lastName };
        localStorage.setItem('deploynix_user', JSON.stringify(currentUser));

        // Load user's profile
        const profiles = JSON.parse(localStorage.getItem('deploynix_profiles')) || {};
        userProfile = profiles[email] || { firstName: user.firstName, lastName: user.lastName };
        localStorage.setItem('deploynix_profile', JSON.stringify(userProfile));

        closeAuthModal();
        updateAuthUI();
        alert('Welcome back, ' + user.firstName + '!');
    } else {
        alert('Invalid email or password. Please try again.');
    }
}

function handleSignUp(e) {
    e.preventDefault();
    const firstName = document.getElementById('signupFirstName').value;
    const lastName = document.getElementById('signupLastName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    if (password.length < 6) {
        alert('Password must be at least 6 characters.');
        return;
    }

    // Save user (in production, this would be server-side)
    const users = JSON.parse(localStorage.getItem('deploynix_users')) || [];

    if (users.find(u => u.email === email)) {
        alert('An account with this email already exists.');
        return;
    }

    users.push({ email, password, firstName, lastName });
    localStorage.setItem('deploynix_users', JSON.stringify(users));

    // Auto sign in
    currentUser = { email, firstName, lastName };
    localStorage.setItem('deploynix_user', JSON.stringify(currentUser));

    userProfile = { firstName, lastName };
    localStorage.setItem('deploynix_profile', JSON.stringify(userProfile));

    closeAuthModal();
    updateAuthUI();
    alert('Account created successfully! Welcome to Deploynix, ' + firstName + '!');
}

function updateAuthUI() {
    const navAuth = document.querySelector('.nav-auth');

    if (currentUser) {
        navAuth.innerHTML = `
            <div class="user-menu">
                <div class="user-avatar" onclick="toggleUserDropdown()">
                    ${currentUser.firstName ? currentUser.firstName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div class="user-dropdown" id="userDropdown">
                    <div class="user-dropdown-header">
                        <strong>${currentUser.firstName || ''} ${currentUser.lastName || ''}</strong>
                        <span>${currentUser.email}</span>
                    </div>
                    <a href="#" onclick="openProfileModal()"><i class="fas fa-user-cog"></i> My Profile</a>
                    <a href="#" onclick="applyPreferences()"><i class="fas fa-magic"></i> Apply Preferences</a>
                    <a href="#" onclick="handleSignOut()"><i class="fas fa-sign-out-alt"></i> Sign Out</a>
                </div>
            </div>
        `;
        navAuth.classList.add('logged-in');
    } else {
        navAuth.innerHTML = `
            <button class="btn-signin" onclick="openAuthModal('signin')">
                <i class="fas fa-user"></i> Sign In
            </button>
        `;
        navAuth.classList.remove('logged-in');
    }
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('active');

    // Close on outside click
    document.addEventListener('click', function closeDropdown(e) {
        if (!e.target.closest('.user-menu')) {
            dropdown.classList.remove('active');
            document.removeEventListener('click', closeDropdown);
        }
    });
}

function handleSignOut() {
    currentUser = null;
    userProfile = null;
    localStorage.removeItem('deploynix_user');
    localStorage.removeItem('deploynix_profile');
    updateAuthUI();
    alert('You have been signed out.');
}

// ==================== PROFILE FUNCTIONS ====================

function openProfileModal() {
    if (!currentUser) {
        openAuthModal('signin');
        return;
    }

    loadProfileData();
    profileModal.classList.add('active');

    // Close dropdown
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('active');
}

function closeProfileModal() {
    profileModal.classList.remove('active');
}

function loadProfileData() {
    if (!userProfile || !currentUser) return;

    const fields = {
        'profileFirstName': userProfile.firstName || currentUser.firstName || '',
        'profileLastName': userProfile.lastName || currentUser.lastName || '',
        'profileEmail': currentUser.email || '',
        'profilePhone': userProfile.phone || '',
        'profileLinkedin': userProfile.linkedin || '',
        'profilePortfolio': userProfile.portfolio || '',
        'prefExperience': userProfile.experience || '',
        'prefSalary': userProfile.salary || '',
        'prefLocation': userProfile.location || '',
        'prefType': userProfile.jobType || '',
        'profileSkills': userProfile.skills || ''
    };

    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    // Handle multi-select roles
    const prefRole = document.getElementById('prefRole');
    if (prefRole && userProfile.roles) {
        Array.from(prefRole.options).forEach(opt => {
            opt.selected = userProfile.roles.includes(opt.value);
        });
    }
}

function saveProfile(e) {
    e.preventDefault();

    const prefRole = document.getElementById('prefRole');
    const selectedRoles = Array.from(prefRole.selectedOptions).map(opt => opt.value);

    userProfile = {
        firstName: document.getElementById('profileFirstName').value,
        lastName: document.getElementById('profileLastName').value,
        phone: document.getElementById('profilePhone').value,
        linkedin: document.getElementById('profileLinkedin').value,
        portfolio: document.getElementById('profilePortfolio').value,
        roles: selectedRoles,
        experience: document.getElementById('prefExperience').value,
        salary: document.getElementById('prefSalary').value,
        location: document.getElementById('prefLocation').value,
        jobType: document.getElementById('prefType').value,
        skills: document.getElementById('profileSkills').value
    };

    localStorage.setItem('deploynix_profile', JSON.stringify(userProfile));

    // Also update in profiles storage
    const profiles = JSON.parse(localStorage.getItem('deploynix_profiles')) || {};
    profiles[currentUser.email] = userProfile;
    localStorage.setItem('deploynix_profiles', JSON.stringify(profiles));

    alert('Profile saved successfully!');
    closeProfileModal();
    updateAuthUI();
}

function applyPreferences() {
    if (!userProfile) {
        alert('Please set up your profile preferences first.');
        openProfileModal();
        return;
    }

    // Apply preferences to filters
    if (userProfile.roles && userProfile.roles.length === 1) {
        roleFilter.value = userProfile.roles[0];
    }
    if (userProfile.experience) {
        experienceFilter.value = userProfile.experience;
    }
    if (userProfile.salary) {
        salaryFilter.value = userProfile.salary;
    }
    if (userProfile.location) {
        locationFilter.value = userProfile.location;
    }
    if (userProfile.jobType) {
        typeFilter.value = userProfile.jobType;
    }

    filterJobs();

    // Scroll to jobs section
    document.getElementById('jobs').scrollIntoView({ behavior: 'smooth' });

    // Close dropdown and modal
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('active');
    closeProfileModal();
}

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add scroll effect to navbar
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(10, 10, 10, 0.98)';
    } else {
        navbar.style.background = 'rgba(10, 10, 10, 0.95)';
    }
});
