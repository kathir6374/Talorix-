# Deplonix — Production Readiness Implementation Plan

## AUDIT SUMMARY

### ✅ EXISTING & WORKING
- Authentication (JWT, signup, login, logout, verify OTP, forgot/reset password)
- Role-based middleware (candidate/employer routing)
- Job CRUD (create, read, update, delete with status management)
- Job listing with filters (search, location, type, experience, salary, sort, pagination)
- Job detail page
- Application system (apply with resume upload to Google Drive)
- Bookmark system (add/remove/list)
- Candidate dashboard (profile editing, resume management, skills, applications, saved jobs, recommendations)
- Employer dashboard (job management, applicant tracking, status updates, candidate search)
- Google Drive integration (resume, avatar, logo uploads)
- Navbar with auth state management
- Companies page and Company detail page
- Candidate public profile page
- ✅ Admin panel (full dashboard: employers, candidates, jobs, verification, reports, monetization, settings)
- ✅ Verified employer badge (admin can verify/unverify employers via admin panel)
- ✅ Report job system (admin moderation queue implemented)
- ✅ Homepage job search bar (links to /jobs with query params)
- ✅ Homepage footer (with links, socials and legal section)
- ✅ Design system tokens (globals.css with CSS variables, dark/light theme)
- ✅ Admin responsive tables (stacked card layout on mobile)
- ✅ Mobile responsive candidate search page
- ✅ Schema extended (certifications, projects, portfolio_links, expected_salary, preferred_location)
- ✅ Email system (Resend API with console fallback; hooked into apply + status update routes)
- ✅ Homepage featured jobs section (dynamic, fetched from /api/jobs, with skeleton loader)
- ✅ Global toast notification system (ToastProvider + useToast() — context-based, all pages)
- ✅ Dashboard loading skeletons (employer + candidate dashboards use shimmer skeleton layouts)

### 🔧 OPTIONAL IMPROVEMENTS (nice-to-have)
1. **Loading states**: Some secondary pages (jobs list, admin panel) could use skeleton loaders
2. **Toast integration in dashboards**: Dashboards could use `useToast()` instead of inline `saveMsg` state for richer UX
3. **Performance**: Image optimization, lazy loading for heavy sections

### 🆕 NEEDS IMPLEMENTATION
- ✅ Phase 9: Email notification for new application received (notify employer)
- ✅ Phase 12: Performance optimizations (bundle analysis, image lazy loading)

## IMPLEMENTATION ORDER (Prioritized by dependency)

### BATCH 1: Schema + Lib Updates ✅ DONE
1. ✅ Update Prisma schema (certifications, projects, portfolio_links, expected_salary, preferred_location)
2. ✅ Add email utility library (Resend or Nodemailer) — done with Resend + console fallback
3. ✅ Run migration

### BATCH 2: API Routes ✅ DONE
4. ✅ Email notification endpoints (application confirmation → candidate, status change → candidate)

### BATCH 3: Polish ✅ DONE
5. ✅ Global toast system (ToastProvider context — src/components/ToastProvider.tsx)
6. ✅ Better loading skeleton states (both employer and candidate dashboards)
7. ✅ Homepage featured jobs section (fetches from /api/jobs, shows shimmer skeleton while loading)
8. Final build verification — TODO


## AUDIT SUMMARY

### ✅ EXISTING & WORKING
- Authentication (JWT, signup, login, logout, verify OTP, forgot/reset password)
- Role-based middleware (candidate/employer routing)
- Job CRUD (create, read, update, delete with status management)
- Job listing with filters (search, location, type, experience, salary, sort, pagination)
- Job detail page
- Application system (apply with resume upload to Google Drive)
- Bookmark system (add/remove/list)
- Candidate dashboard (profile editing, resume management, skills, applications, saved jobs, recommendations)
- Employer dashboard (job management, applicant tracking, status updates, candidate search)
- Google Drive integration (resume, avatar, logo uploads)
- Navbar with auth state management
- Companies page and Company detail page
- Candidate public profile page
- ✅ Admin panel (full dashboard: employers, candidates, jobs, verification, reports, monetization, settings)
- ✅ Verified employer badge (admin can verify/unverify employers via admin panel)
- ✅ Report job system (admin moderation queue implemented)
- ✅ Homepage job search bar (links to /jobs with query params)
- ✅ Homepage footer (with links, socials and legal section)
- ✅ Design system tokens (globals.css with CSS variables, dark/light theme)
- ✅ Admin responsive tables (stacked card layout on mobile)
- ✅ Mobile responsive candidate search page

### 🔧 NEEDS FIXING/IMPROVEMENT
1. **Schema**: Missing fields for certifications, projects, portfolio_links, expected_salary, preferred_location
2. **Email system**: OTP/reset codes only log to console — no actual email sending
3. **Homepage**: No featured jobs section (jobs pulled dynamically)
4. **Loading states**: Missing in many places (employer/candidate dashboard initial load)
5. **Toast notifications**: No global notification system (admin uses local inline toasts)

### 🆕 NEEDS IMPLEMENTATION
- Phase 9: Email notification system (Resend/Nodemailer)
- Phase 12: Performance optimizations
- Phase 13: Product polish (global toast system, better loading skeletons)
- Phase 14: Homepage featured jobs section (dynamic, from API)
- Phase 15: Missing schema fields (certifications, projects, portfolio, salary expectations)

## IMPLEMENTATION ORDER (Prioritized by dependency)

### BATCH 1: Schema + Lib Updates
1. Update Prisma schema (add missing fields: certifications, projects, portfolio_links, expected_salary, preferred_location)
2. Add email utility library (Resend or Nodemailer)
3. Run migration

### BATCH 2: API Routes
4. Email notification endpoints (application status changes, new applications)

### BATCH 3: Polish
5. Global toast system (context-based, usable across all pages)
6. Better loading skeleton states for dashboards
7. Homepage featured jobs section (fetch from API)
8. Final build verification
