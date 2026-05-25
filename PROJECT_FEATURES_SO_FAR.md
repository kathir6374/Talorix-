# Deplonix Job Platform - Project Features & Progress Documentation

This document summarizes all the features, integrations, and architectural decisions implemented in the Deplonix Job Platform up to the current stage.

## 1. Core Architecture & Tech Stack
- **Frontend Framework:** Next.js (App Router) with React.
- **Styling:** TailwindCSS for responsive, modern, and aesthetic UI layouts.
- **Backend/API:** Next.js API Routes (`/src/app/api/...`) for seamless client-server communication.
- **Database:** PostgreSQL (hosted on Supabase).
- **ORM:** Prisma ORM for type-safe database access and schema management.
- **Authentication:** Custom JWT-based authentication with Edge Middleware protection to secure routes based on user roles (`candidate` vs `employer`).

---

## 2. Authentication & Authorization System
- **Role-Based Access Control (RBAC):** Distinct roles and routing for Candidates and Employers.
- **Registration Flow (`/signup`):** Users can sign up and choose their role.
- **Email Verification (`/verify`):** OTP-based email verification logic to verify user accounts.
- **Login Flow (`/login`):** JWT token generation stored securely in cookies.
- **Forgot Password (`/forgot-password`):** Password recovery capabilities.
- **Logout (`/api/auth/logout`):** Secure session termination.

---

## 3. Candidate Experience & Features
### A. Candidate Dashboard (`/candidate-dashboard`)
- **Profile Management:** Candidates can manage their details including skills, experience, education, social links, and open-to-work status.
- **Profile Completion Score:** A dynamic progress bar indicating how complete the candidate's profile is, encouraging them to add missing details.
- **Recommended Jobs:** A customized section displaying job postings relevant to the candidate's skills and profile.

### B. Resume Management (Google Drive Integration)
- **Google Drive API Integration:** Instead of standard bucket storage, candidate resumes are securely uploaded directly to a unified Google Drive folder using service account credentials.
- **Resume Operations:** Candidates can upload, replace, and delete their primary resumes from their dashboard.

### C. Job Search & Application Process
- **Job Board (`/jobs`):** Public job board to browse and search for active job listings.
- **Job Applications:** Candidates can apply to jobs while submitting specific applicant details (Name, Phone, Address) along with their resume.
- **Job Bookmarking:** Candidates can save/bookmark jobs they are interested in for later viewing (`/api/bookmarks`).

---

## 4. Employer Experience & Features
### A. Employer Dashboard (`/employer-dashboard`)
- **Company Profile:** Employers can set up their company page with logos, descriptions, and industry details.
- **Company Logo Upload (`/api/upload/logo`):** Dedicated endpoint to handle company branding.

### B. Comprehensive Job Management
- **Job Posting:** Extensive job creation form covering:
  - Job Title, Description, Category, Type (Full-time, Part-time, etc.)
  - Work Model (Onsite, Remote, Hybrid)
  - Location Details (Country, State, City)
  - Salary Information (Range, Currency, Type)
  - Requirements (Min/Max Experience, Education level, Required Skills JSON)
  - HR Contact Details & Benefits.
- **Job Status Toggling:** Employers can dynamically change job statuses (`ACTIVE`, `PAUSED`, `CLOSED`/Deleted).

### C. Applicant Tracking System (ATS)
- **Applicant Analytics:** Employers can view the breakdown and status of candidates who applied.
- **Application Management:** Track candidate application states ('applied', 'shortlisted', 'interview', 'rejected', 'hired').
- **Candidate Search:** Advanced search capabilities empowering employers to proactively find potential candidates in the database based on predefined criteria.

---

## 5. Database Schema Structure (Prisma)
- **User Model:** Comprehensive fields handling both candidate specifics (skills, experience arrays) and employer specifics (company details).
- **Job Model:** Extensive fields perfectly mirroring the detailed job posting capabilities.
- **Application Model:** Linking Candidates to Jobs along with a snapshot of their details and current system status.
- **Bookmark Model:** Allowing many-to-many relationship mapping between Users and Jobs for saved jobs functionality.

---
*Document automatically generated based on the project's current state.*
