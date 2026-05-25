const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Create required directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const applicationsDir = path.join(__dirname, 'applications');
const jobsDir = path.join(__dirname, 'data'); // Directory for system data like jobs.json

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(applicationsDir)) {
    fs.mkdirSync(applicationsDir, { recursive: true });
}

if (!fs.existsSync(jobsDir)) {
    fs.mkdirSync(jobsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Create unique filename with timestamp and original name
        const timestamp = Date.now();
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}_${sanitizedName}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept only PDF, DOC, DOCX files
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// API Routes

// Helper to get jobs file path
const jobsFile = path.join(jobsDir, 'jobs.json');

// Initialize with default jobs if empty or missing
function initializeJobs() {
    if (!fs.existsSync(jobsFile)) {
        const initialJobs = [
            {
                id: 1, title: "Senior Full Stack Developer", company: "TechCorp Solutions", department: "engineering", type: "full-time", location: "remote", salary: "$120k - $160k", salaryMin: 120, experience: "5+", experienceYears: 5, description: "Looking for a Senior Full Stack Developer to join the engineering team. You'll work on cutting-edge technologies and build scalable applications.", tags: ["React", "Node.js", "TypeScript", "AWS"], posted: "2 days ago", postedDays: 2, role: "developer"
            },
            {
                id: 2, title: "UX/UI Designer", company: "Creative Labs Inc.", department: "design", type: "full-time", location: "hybrid", salary: "$90k - $120k", salaryMin: 90, experience: "3+", experienceYears: 3, description: "Join the design team to create beautiful, intuitive user experiences. Work closely with product and engineering teams to bring ideas to life.", tags: ["Figma", "Adobe XD", "Prototyping", "User Research"], posted: "5 days ago", postedDays: 5, role: "designer"
            }
        ];
        fs.writeFileSync(jobsFile, JSON.stringify(initialJobs, null, 2));
    }
}
initializeJobs();

// Get all jobs
app.get('/api/jobs', (req, res) => {
    try {
        if (!fs.existsSync(jobsFile)) return res.json({ jobs: [] });
        const data = fs.readFileSync(jobsFile, 'utf-8');
        res.json({ jobs: JSON.parse(data) });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ success: false, message: 'Error fetching jobs' });
    }
});

// Post a new job (Employer endpoint)
app.post('/api/jobs', (req, res) => {
    try {
        const { title, company, department, type, location, salary, experience, description, tags, role } = req.body;

        let jobs = [];
        if (fs.existsSync(jobsFile)) {
            const data = fs.readFileSync(jobsFile, 'utf-8');
            jobs = JSON.parse(data);
        }

        // Basic parsing for sorting
        const salaryMinMatch = salary ? salary.match(/\$(\d+)/) : null;
        const salaryMin = salaryMinMatch ? parseInt(salaryMinMatch[1]) : 0;
        const expMatch = experience ? experience.match(/(\d+)/) : null;
        const experienceYears = expMatch ? parseInt(expMatch[1]) : 0;

        const tagArray = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];

        const newJob = {
            id: Date.now(),
            title, company, department, type, location, salary, salaryMin,
            experience, experienceYears, description, tags: tagArray,
            posted: "Just now", postedDays: 0, role
        };

        jobs.unshift(newJob); // Add to top
        fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));

        res.json({ success: true, message: 'Job posted successfully!', job: newJob });
    } catch (error) {
        console.error('Error posting job:', error);
        res.status(500).json({ success: false, message: 'Error posting job' });
    }
});

// Submit job application
app.post('/api/apply', upload.single('resume'), (req, res) => {
    try {
        const { jobId, jobTitle, companyName, fullName, email, phone, linkedin, portfolio, experience, coverLetter } = req.body;
        const resumeFile = req.file;

        if (!resumeFile) {
            return res.status(400).json({
                success: false,
                message: 'Resume file is required'
            });
        }

        // Create application record
        const application = {
            id: Date.now(),
            jobId,
            jobTitle,
            companyName,
            fullName,
            email,
            phone,
            linkedin: linkedin || null,
            portfolio: portfolio || null,
            experience,
            coverLetter: coverLetter || null,
            resume: {
                filename: resumeFile.filename,
                originalName: resumeFile.originalname,
                path: resumeFile.path,
                size: resumeFile.size
            },
            appliedAt: new Date().toISOString(),
            status: 'new'
        };

        // Save application to JSON file
        const applicationsFile = path.join(applicationsDir, 'applications.json');
        let applications = [];

        if (fs.existsSync(applicationsFile)) {
            const data = fs.readFileSync(applicationsFile, 'utf-8');
            applications = JSON.parse(data);
        }

        applications.push(application);
        fs.writeFileSync(applicationsFile, JSON.stringify(applications, null, 2));

        // Log new application
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📩 NEW JOB APPLICATION RECEIVED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📋 Position: ${jobTitle}`);
        console.log(`🏢 Company: ${companyName}`);
        console.log(`👤 Name: ${fullName}`);
        console.log(`📧 Email: ${email}`);
        console.log(`📱 Phone: ${phone}`);
        console.log(`💼 Experience: ${experience}`);
        if (linkedin) console.log(`🔗 LinkedIn: ${linkedin}`);
        if (portfolio) console.log(`🌐 Portfolio: ${portfolio}`);
        console.log(`📄 Resume: ${resumeFile.originalname}`);
        console.log(`📁 Saved to: ${resumeFile.path}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        res.json({
            success: true,
            message: 'Application submitted successfully!',
            applicationId: application.id
        });

    } catch (error) {
        console.error('Error processing application:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing your application. Please try again.'
        });
    }
});

// Get all applications (admin endpoint)
app.get('/api/applications', (req, res) => {
    try {
        const applicationsFile = path.join(applicationsDir, 'applications.json');

        if (!fs.existsSync(applicationsFile)) {
            return res.json({ applications: [] });
        }

        const data = fs.readFileSync(applicationsFile, 'utf-8');
        const applications = JSON.parse(data);

        res.json({ applications });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching applications'
        });
    }
});

// Download resume
app.get('/api/resume/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            success: false,
            message: 'File not found'
        });
    }

    res.download(filePath);
});

// Error handling for multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    next();
});

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('    ██████╗ ███████╗██████╗ ██╗      ██████╗ ██╗   ██╗███╗   ██╗██╗██╗  ██╗');
    console.log('    ██╔══██╗██╔════╝██╔══██╗██║     ██╔═══██╗╚██╗ ██╔╝████╗  ██║██║╚██╗██╔╝');
    console.log('    ██║  ██║█████╗  ██████╔╝██║     ██║   ██║ ╚████╔╝ ██╔██╗ ██║██║ ╚███╔╝ ');
    console.log('    ██║  ██║██╔══╝  ██╔═══╝ ██║     ██║   ██║  ╚██╔╝  ██║╚██╗██║██║ ██╔██╗ ');
    console.log('    ██████╔╝███████╗██║     ███████╗╚██████╔╝   ██║   ██║ ╚████║██║██╔╝ ██╗');
    console.log('    ╚═════╝ ╚══════╝╚═╝     ╚══════╝ ╚═════╝    ╚═╝   ╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝');
    console.log('');
    console.log('                        🚀 JOB PORTAL SERVER 🚀');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`    🌐 Server running at: http://localhost:${PORT}`);
    console.log(`    📁 Resumes stored in: ${uploadsDir}`);
    console.log(`    📋 Applications stored in: ${applicationsDir}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('    Waiting for applications...');
    console.log('');
});

module.exports = app;
