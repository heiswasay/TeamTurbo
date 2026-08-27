# Team Daily Work Tracking & Attendance System

A production-ready web application built for teams to log daily work accomplishments, track shifts & attendance hours, execute handovers, delegate tasks, and conduct live reviews.

---

## 🌟 Key Features

### 👤 Team Member Experience
- **Daily Shift Clock**: Real-time Start Clock / Stop Clock session tracker with live elapsed timers, paused state handling, and daily total calculations.
- **Log Daily Tasks**: Add accomplishments with Company/Client dropdown tags, rich task summaries, time spent (e.g. `2h 30m`), and status (In Progress, Completed, Pending, Blocked).
- **Needs Rework Alert Banner**: Visual high-priority notification banner when an admin requests revisions, with inline editing and one-click resubmission.
- **Assigned to Me**: Direct visibility into tasks assigned by team leads with priorities (High, Medium, Low), due dates, and status checkboxes.
- **Shift Handovers**: Send handovers with pending work notes, priority tags, and client tags to specific teammates. Teammates receive instant alerts and can acknowledge transfer.
- **Historical Work Archives**: Expandable past daily archives with filters by company and status.

### 🛡️ Team Lead / Admin Experience
- **Live Today Dashboard**: Real-time team monitoring showing live shift clock status, total entries logged today, and instant inline review (OK / Needs Rework / Pending) with remarks.
- **Yesterday & Daily Review**: Comprehensive review matrix for any selected date with inline reviews and remarks without disrupting work.
- **Unreviewed Queue**: Backlog review queue sorted oldest first to ensure no team accomplishment slips through.
- **Shift Attendance & HR Matrix**: Real-time shift state, session logs, shortfall flags when hours fall below schedule, and HR CSV export.
- **Task Delegation**: Assign tasks to team members with due dates, descriptions, and priority tags.
- **Team Overview Matrix**: One-row-per-member operational overview showing today's count, pending reviews, open tasks, unacknowledged handovers, and missing-log alerts.
- **Monthly Analytics & Reports**: Completion rates, rework rates, top client distributions, full-text task/remarks search, and filtered CSV export.
- **User & Company Management**: Admin user provisioning (temporary password initialization), role editing, shift window adjustments, account deactivation, and company tag management.

---

## 🚀 Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (Sophisticated Dark Mode by default)
- **Backend & Realtime Database**: Firebase Authentication, Cloud Firestore
- **Icons**: Lucide React
- **Animations**: Motion

---

## 🛠️ Environment Variables

Create a `.env` or `.env.local` file in the root directory (refer to `.env.example`):

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

---

## 🔑 Quick Demo Credentials

For testing and local development, the login screen includes a **1-Click Quick Demo Switcher**:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Team Lead (Admin)** | `admin@teamturbo.com` | `TeamTurbo123!` |
| **Full Stack Developer** | `bilal@teamturbo.com` | `TeamTurbo123!` |
| **UI/UX Designer** | `hamza@teamturbo.com` | `TeamTurbo123!` |
| **Digital Marketer** | `zain@teamturbo.com` | `TeamTurbo123!` |
| **SEO Specialist** | `usman@teamturbo.com` | `TeamTurbo123!` |
| **Content Writer** | `sara@teamturbo.com` | `TeamTurbo123!` |

*(Users logging in with default temporary credentials will be prompted to set a permanent private password if `forcePasswordChange: true`).*

---

## 📦 Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open browser**:
   Navigate to `http://localhost:3000`.

---

## 🚢 Vercel Deployment Guide

1. Push this repository to GitHub or GitLab.
2. In the **Vercel Dashboard**, click **"Add New"** > **"Project"** and import the repository.
3. Configure the build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the **Environment Variables** in the Vercel project settings:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. Click **Deploy**. Vercel will automatically build and serve the production applet with SPA routing support.
