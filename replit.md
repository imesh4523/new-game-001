# Overview

This project is a full-stack, real-time color prediction betting game. Players can place bets on colors, numbers, or size categories within timed rounds, receiving live updates via WebSockets. The application supports multiple concurrent bets and provides users with a demo balance to start. The business vision is to create an engaging and accessible online betting platform with real-time interaction, aiming for broad market potential in the online gaming sector.

# User Preferences

Preferred communication style: Simple, everyday language (Sinhala/English mix accepted).

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript, using Vite.
- **UI Components**: Shadcn/ui and Radix UI for accessible components.
- **Styling**: Tailwind CSS with dark theme.
- **State Management**: TanStack Query for server state, React local state for UI.
- **Routing**: Wouter for client-side routing.
- **Real-time**: WebSocket hook for live updates.

## Backend Architecture
- **Server**: Express.js with TypeScript on Node.js.
- **API Design**: RESTful for user, game, and betting operations.
- **Real-time**: WebSocket server for broadcasting game states and results, with server-side state management for automatic round progression.
- **Real-time Database Sync**: Automated synchronization of critical data operations to backup databases via a queue-based system.
- **Digital Ocean Integration**: Admin dashboard integration for managing Digital Ocean Droplets, including server details, refresh, and application deployment.
- **Nginx Load Balancer**: Admin dashboard UI for configuring Nginx load balancing methods, server weights, previewing configurations, and one-click deployment.
- **VIP Level System**: Users progress through VIP levels based on referral count or deposit, with real-time WebSocket synchronization of VIP settings, bet limits, and commission rates.
- **Notification System**: Comprehensive notification system with database storage, RESTful API, and real-time UI updates for broadcast or targeted messages.
- **User Geography**: Enhanced IP detection with proper handling of proxy headers (CF-Connecting-IP, X-Forwarded-For) to capture real client IPs instead of Cloudflare/CDN proxy IPs, preventing false-positive multi-account detection.
- **Email System**: Comprehensive email service with dual configuration options (SMTP and SendGrid) via admin dashboard, supporting password reset, deposit confirmation, and VIP upgrade emails.
- **Admin Features**: Enhanced user management, accurate transaction display, admin prediction recording, user report PDF generation, Telegram Signals integration toggle, admin action logging, and global freeze/unfreeze control for managing frozen balances across all users.

## Data Storage Solutions
- **ORM**: Drizzle ORM configured for PostgreSQL with type-safe schema definitions.
- **Database**: PostgreSQL with dual driver support (Neon serverless and standard PostgreSQL) with automatic driver selection.
- **Schema**: Comprehensive schema with 19 tables, including users, games, bets, transactions, and VIP configurations.

## Authentication and Authorization
- **User System**: Demo user creation for immediate access.
- **Session Management**: Cookie-based sessions using connect-pg-simple.
- **Security**: Basic user identification.

# External Dependencies

- **Database**: PostgreSQL (Neon serverless driver).
- **UI Framework**: Radix UI.
- **Development Tools**: Replit-specific plugins, ESBuild, TypeScript.
- **Form Handling**: React Hook Form with Zod validation.
- **Deployment**: Digital Ocean API for VPS management and application deployment.
- **Email**: SendGrid (optional).
- **Messaging**: Telegram API (optional).