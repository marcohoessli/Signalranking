# SignalRanking - Product Requirements Document

## Original Problem Statement
SignalRanking is a forecasting platform where users compete to predict real-world events and build a public accuracy score. It is NOT gambling and does NOT involve real money.

## User Personas
1. **Forecasters** - Users who make predictions to build their track record
2. **Analysts** - Users who want to track accuracy across categories
3. **Admins** - Platform managers who create/resolve questions

## Core Requirements
- Email/password + Google OAuth authentication
- Prediction questions with categories (Crypto, Politics, Tech, Sports, Other)
- Probability predictions (0-100%)
- Brier Score accuracy tracking
- Global leaderboards
- User profiles with prediction history
- Role-based admin panel

## What's Been Implemented (Jan 2026)
- [x] Landing page with value proposition
- [x] JWT + Google OAuth authentication (Emergent Auth)
- [x] Dashboard with question listing and category filters
- [x] Question detail page with probability slider (0-100%)
- [x] Prediction submission and editing
- [x] Admin panel - create questions, resolve outcomes (YES/NO)
- [x] Brier Score calculation and accuracy tracking
- [x] Global leaderboard (min predictions filter)
- [x] User profiles with category breakdown
- [x] Role-based access control (user/admin)

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (users, questions, predictions, sessions)
- **Auth**: JWT tokens + Emergent Google OAuth

## Sample Admin Credentials
- Email: admin@signalranking.com
- Password: admin123

## Backlog (P0/P1/P2)
### P0 (Critical)
- None - MVP complete

### P1 (High Priority)
- Email verification on signup
- Password reset flow
- Question comments/discussion

### P2 (Future)
- Real-money markets
- Advanced analytics dashboard
- User tiers/subscriptions
- API for prediction data
- Social sharing of predictions
