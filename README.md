# CMS Preschool Dashboard v3 (Firebase)

Real-time attendance system powered by Firebase.

## What Changed from v2

- Attendance now uses Firebase (instant updates!)
- Student roster still comes from Google Sheets
- All tablets see the same attendance data in real-time

## Setup

1. Push to GitHub
2. Render auto-deploys

## Pages

| Page | URL |
|------|-----|
| Home | `/` |
| Kiosk | `/#/kiosk` |
| Dashboard | `/#/dashboard` |
| Stats | `/#/stats` |

## Data Sources

- **Roster/Schedule**: Google Sheets (CMS Master Database)
- **Attendance**: Firebase Firestore
