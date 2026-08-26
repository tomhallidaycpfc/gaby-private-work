# Gaby's Private Work Tracker

A mobile-first web app for tracking work hours, generating invoices, and managing payments. Built with Next.js and deployed free on Vercel.

## 🎯 What This Does

- **Log Work**: Record hours, client, and rate on any device
- **Auto Invoicing**: Generate professional invoices monthly
- **Payments**: Track which invoices are paid
- **Email**: Send invoices and payment reminders automatically
- **Mobile**: Use on iPhone/Android like a native app

## ⚡ Quick Start

### 1. Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### 2. Configuration

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
OUTLOOK_EMAIL=your-email@outlook.com
OUTLOOK_PASSWORD=your_app_password
```

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

### 3. Deploy to Vercel

1. Push code to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy!

## 📱 Features

### Time Tracking
- Log work session with start/end time
- Auto-calculate hours and amount
- Add notes for each session
- Mobile-responsive UI

### Client Management
- Add unlimited clients
- Set hourly rates per client
- Store contact info
- Email preferences

### Invoicing
- Auto-generate monthly invoices
- Group sessions by client
- Include VAT calculations
- Professional formatting

### Payment Tracking
- Mark invoices as paid
- Record payment method
- Send payment reminders
- Chaser emails for unpaid invoices

## 🗂️ Project Structure

```
src/
├── app/
│   ├── page.tsx           # Main UI
│   └── api/
│       ├── sessions/      # Work sessions API
│       ├── clients/       # Clients API
│       ├── invoices/      # Invoices API
│       └── payments/      # Payments API
├── components/
│   ├── TimeTracker.tsx    # Log work form
│   ├── SessionsList.tsx   # View sessions
│   └── ClientSelector.tsx # Manage clients
├── lib/
│   ├── supabase.ts        # Database client
│   └── utils.ts           # Helper functions
└── types/
    └── index.ts           # TypeScript types
```

## 🔧 Technology Stack

- **Frontend**: React 19 + Next.js 15
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel (free)
- **Email**: Outlook (via SMTP)

## 📚 Documentation

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete setup instructions

## 🚀 Deployment

### Free Hosting on Vercel

1. Push to GitHub
2. Import in Vercel dashboard
3. Add environment variables
4. Done! Your app is live

## 💡 Tips

**Mobile Use:**
- Open in Safari/Chrome
- Tap "Add to Home Screen"
- Works like an app!

**Best Practices:**
- Log work daily while fresh
- Review sessions before invoice
- Keep hourly rates updated

## 🆘 Troubleshooting

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed troubleshooting.

---

**Built for Gaby's Private Work**
