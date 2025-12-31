# **Offline-First Smart Library Management System**

**Project Code:** church-library-app

**Architect:** Natinael Samuel (DiguwaSoft)

## **📖 Overview**

The **Offline-First Smart Library Management System** is a production-grade software platform designed to manage library operations in environments where network reliability cannot be guaranteed (e.g., churches, schools, and public institutions in developing regions).

Unlike traditional client-server apps, this system adopts a **Device-Centric, Offline-First** architecture. The local device acts as the primary authority for daily operations, ensuring that workflows like borrowing, returning, and attendance are never blocked by internet instability. Data is synchronized asynchronously with a centralized backend.

### **Production Variants**

This core codebase powers two distinct commercial products:

1. **Otona St. Mary Library Management App** (Religious Institutions)  
2. **Fayda Smart Library Management** (Schools & Public Libraries)

## **✨ Key Features**

* **🔌 Offline-First Architecture**: Zero dependency on real-time internet. All writes (attendance, transactions) occur locally in SQLite and sync when online.  
* **🔒 Device Binding Security**: Librarian accounts are cryptographically bound to specific physical devices to prevent credential sharing.  
* **📍 High Attendance Verification (HAV)**: Proves physical presence by requiring librarians to scan specific book inventory items upon login, replacing invasive GPS/Biometric systems.  
* **⏱️ Shift Management**: Enforces strict operational windows with automatic, forced logouts when shifts expire.  
* **🔄 Commit-Based Synchronization**: A robust sync engine (Push/Pull) that handles data conflicts and ensures eventual consistency.  
* **📱 Barcode Integration**: Built-in high-performance scanning for books (Code128/EAN-13) and Patron IDs.

## **🛠️ Technology Stack**

* **Frontend Framework**: React Native (via Expo)  
* **Language**: TypeScript  
* **Local Database**: SQLite (via expo-sqlite) \- *Source of Truth for Runtime*  
* **Remote Backend**: Supabase (PostgreSQL) \- *Source of Truth for Persistence*  
* **Navigation**: Expo Router (File-system based)  
* **Security**: Argon2/SHA-256 for PIN hashing

## **🏗️ Architecture**

The system follows a **Local-First** execution model:

1. **Presentation Layer**: The React Native UI interacts *only* with the local database.  
2. **Local Data Layer**: SQLite stores all patrons, books, and transactions.  
3. **Sync Layer**:  
   * **Mutations**: Every local action (Insert/Update/Delete) generates a **Commit** record.  
   * **Sync**: These commits are queued and pushed to Supabase when connectivity is available.  
   * **Idempotency**: The backend ensures no operation is processed twice.

## **📂 Project Structure**

church-library-app/  
├── app/                     \# Application routes (Expo Router)  
│   ├── (tabs)/              \# Main application tab navigation  
│   ├── auth/                \# Login, PIN management, Device Binding  
│   ├── attendance/          \# HAV and scanning workflows  
│   └── admin/               \# Local administrative dashboards  
├── db/                      \# Local database access layer  
│   ├── queries/             \# Domain-specific SQL query functions  
│   ├── sqlite.ts            \# Database initialization and schema  
│   └── commits.ts           \# Sync-log management & Logic  
├── lib/                     \# Core business logic  
│   ├── authUtils.ts         \# Security and hashing helpers  
│   ├── session.ts           \# Global user state  
│   └── shiftSession.ts      \# Shift auto-logout logic  
└── utils/                   \# Shared utilities (Formatting, Guards)

## **🚀 Getting Started**

### **Prerequisites**

* Node.js (LTS)  
* Expo CLI  
* Supabase Account

### **Installation**

1. **Clone the repository:**  
   git clone \[https://github.com/DiguwaSoft/church-library-app.git\](https://github.com/DiguwaSoft/church-library-app.git)  
   cd church-library-app

2. **Install dependencies:**  
   npm install

3. Configure Environment:  
   Create a .env file in the root directory (see Configuration below).  
4. **Run the application:**  
   npx expo start

## **⚙️ Configuration (.env)**

The application relies on environment variables for branding, backend connection, and business rules.

### **Core Configuration**

| Variable | Description |
| :---- | :---- |
| EXPO\_PUBLIC\_SUPABASE\_URL | URL for the specific institution's Supabase project. |
| EXPO\_PUBLIC\_SUPABASE\_ANON\_KEY | Public anonymous access key. |
| EXPO\_PUBLIC\_APP\_NAME | Display name (e.g., "Otona St. Mary"). |
| EXPO\_PUBLIC\_APP\_VARIANT | Deployment variant (church or education). |

### **Business Rules & Branding**

| Variable | Default | Description |
| :---- | :---- | :---- |
| EXPO\_PUBLIC\_HIGH\_ATTENDANCE\_VERIFICATION | false | Enable/Disable book-scan requirement for login. |
| EXPO\_PUBLIC\_NUMBER\_OF\_BOOKS\_TO\_SCAN | 3 | Number of items to scan to verify presence. |
| EXPO\_PUBLIC\_SHIFT\_ENFORCEMENT | true | Enforce strict login windows. |
| EXPO\_PUBLIC\_PRIMARY\_COLOR | \#Hex | Institution-specific UI theme color. |

## **🛡️ Security Model**

1. **Device Trust**: The system uses device\_id binding. A librarian cannot log in from a new phone without Admin approval.  
2. **PIN Security**: User PINs are salted and hashed locally. They are never transmitted in plain text.  
3. **Fail-Closed**: Critical operations (Login, HAV, Shift validation) default to "Deny" if an error occurs.  
4. **Tenant Isolation**: Adopts a **One-Institution-One-Database** model. Otona data is physically separated from Fayda data.

## **✍️ Author & Maintenance**

**Developed by:** [DiguwaSoft](https://natinael-samuel.netlify.app)

**Lead Architect:** Natinael Samuel

**Status:** Version 1.1 (Production Candidate)

*For commercial deployment, support, or licensing inquiries, please contact the DiguwaSoft engineering team.*