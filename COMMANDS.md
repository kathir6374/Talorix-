# 🚀 Project Command Reference: Deplonix

This document serves as a central reference for all command-line operations. All major operations have been integrated into `npm` scripts for ease of use.

## 🛠️ Core Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts the development server at `http://localhost:3000`. |
| `npm run build` | Generates Prisma client and builds the application. |
| `npm run start` | Starts the production server. |
| `npm run lint` | Runs ESLint to check for code issues. |

---

## 🗄️ Database Operations (Prisma)

| Command | Description |
|---------|-------------|
| `npm run db:studio` | Opens a web GUI to view/edit your database data. |
| `npm run db:push` | Syncs the database schema with the Prisma schema. |
| `npx prisma migrate dev` | Creates and runs a new migration. |

---

## 🔧 Testing & Diagnostics

Integrated testing workflows for external services.

| Command | Description |
|---------|-------------|
| `npm run test:drive` | Verifies Google Service Account and tests file uploads. |
| `npm run test:folder` | Tests Google Drive folder accessibility and permissions. |
| `npm run test:final` | Runs the full integration test suite (`final-test.js`). |

---

## 👤 User & Admin Management

Administrative scripts for managing the platform.

| Command | Description |
|---------|-------------|
| `npm run admin:list-users` | Lists all users currently in the database. |
| `npm run admin:make-admin` | Grants administrative privileges to a user. |
| `npm run admin:check-fields` | Validates database fields for consistency. |
| `npm run test:reset-pass` | Resets a test user's password to `123456`. |

---

## 🛠️ Maintenance

| Command | Description |
|---------|-------------|
| `npm run fix:links` | Global script to update or fix social/navigation links. |

---

## ☁️ Deployment (Vercel)

| Command | Description |
|---------|-------------|
| `vercel` | Deploys a preview version. |
| `vercel --prod` | Deploys to the production environment. |

---

> [!TIP]
> **Convenience**: You can now run these commands from any terminal in the project root without needing to remember specific filenames or `npx` prefixes.
