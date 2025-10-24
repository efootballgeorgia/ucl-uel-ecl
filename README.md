# ⚽ Efootball Georgia

A modern, Progressive Web Application (PWA) for tracking and managing European football league standings, matches, and knockout stages for UEFA Champions League (UCL), Europa League (UEL), and Conference League (ECL).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![PWA](https://img.shields.io/badge/PWA-enabled-green.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

## 🌟 Features

### Core Functionality
- **📊 Live League Tables**: Real-time standings with sortable columns (Points, Wins, Draws, Losses, Goal Difference)
- **⚽ Match Schedules**: Browse matches by match day or filter by specific teams
- **🏆 Knockout Stages**: View and track knockout tournament brackets
- **🔄 Multi-League Support**: Switch seamlessly between UCL, UEL, and ECL
- **🎨 Dynamic Theming**: Each league has its own unique color scheme and branding

### Technical Features
- **📱 Progressive Web App**: Install on any device, works offline
- **⚡ Real-time Updates**: Live data synchronization using Supabase
- **🔐 Authentication**: Secure user login and admin capabilities
- **🎯 Responsive Design**: Optimized for mobile, tablet, and desktop
- **♿ Accessible**: WCAG compliant with ARIA labels and keyboard navigation
- **🚀 Optimized Performance**: Service worker caching, lazy loading, and efficient rendering

### Admin Features (Authenticated Users)
- **✏️ Edit Scores**: Update match results in real-time
- **🗑️ Delete Matches**: Remove incorrect or duplicate entries
- **📝 Manage Fixtures**: Full CRUD operations on match data

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ (for development)
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Supabase account (for backend services)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd webapp
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Serve the Application**
   
   For development:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve -p 8000
   
   # Using PHP
   php -S localhost:8000
   ```

4. **Access the Application**
   
   Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## 📁 Project Structure

```
webapp/
├── index.html              # Main HTML file
├── styles.css              # Global styles and theme variables
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker for offline functionality
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
│
├── js/
│   ├── main.js             # Application entry point and event handlers
│   ├── supabase.js         # Supabase client and data operations
│   ├── ui-table.js         # League table rendering and sorting
│   ├── ui-matches.js       # Matches section rendering and filtering
│   ├── ui-knockout.js      # Knockout bracket rendering
│   └── ui-feedback.js      # User feedback and notifications
│
└── images/
    ├── logos/              # League and team logos
    ├── background-video.mp4 # Background video
    └── ...
```

## 🛠️ Technology Stack

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Custom properties, Grid, Flexbox
- **Vanilla JavaScript (ES6+)**: Modular architecture with ES modules
- **Progressive Web App**: Service Worker, Web App Manifest

### Backend & Services
- **Supabase**: 
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication
  - Row Level Security (RLS)

### External Libraries
- **Poppins Font**: Google Fonts
- **Lazysizes**: Lazy loading images (5.3.2)

## 🎨 Theme Customization

The application supports three distinct themes:

```css
/* Champions League - Blue/Gold */
.ucl-theme { --accent-color: #4134b4; }

/* Europa League - Orange/Black */
.uel-theme { --accent-color: #ff4500; }

/* Conference League - Green/Black */
.ecl-theme { --accent-color: #00ff85; }
```

Themes automatically switch based on league selection.

## 🔒 Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Analytics
GA_TRACKING_ID=your-google-analytics-id

# Optional: Performance Monitoring
SENTRY_DSN=your-sentry-dsn
```

**⚠️ Security Note**: Never commit `.env` files to version control. The `.env.example` file provides a template.

## 📊 Database Schema

### Tables

#### `matches`
```sql
- id (uuid, primary key)
- league (text: 'ucl' | 'uel' | 'ecl')
- day (integer)
- home_team (text)
- away_team (text)
- home_score (integer, nullable)
- away_score (integer, nullable)
- date (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `knockout_matches`
```sql
- id (uuid, primary key)
- league (text: 'ucl' | 'uel' | 'ecl')
- round (text: 'round_16' | 'quarter' | 'semi' | 'final')
- leg (integer: 1 | 2)
- home_team (text)
- away_team (text)
- home_score (integer, nullable)
- away_score (integer, nullable)
- date (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `teams`
```sql
- id (uuid, primary key)
- name (text)
- league (text: 'ucl' | 'uel' | 'ecl')
- played (integer, default: 0)
- wins (integer, default: 0)
- draws (integer, default: 0)
- losses (integer, default: 0)
- goals_for (integer, default: 0)
- goals_against (integer, default: 0)
- points (integer, default: 0)
- form (text[], recent match results)
```

## 🚢 Deployment

### Static Hosting (Recommended)

The application is a static site and can be deployed to any static hosting service:

#### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

#### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### GitHub Pages
```bash
# Push to gh-pages branch
git subtree push --prefix . origin gh-pages
```

#### Cloudflare Pages
```bash
# Connect your repository to Cloudflare Pages
# Build settings:
# - Build command: (leave empty)
# - Build output directory: /
```

### Environment Variables in Production

For each hosting platform, add your environment variables through their dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

**Note**: Since this is a client-side application, you'll need to inject environment variables at build time or use a build script to replace placeholders.

## 🧪 Testing

### Manual Testing Checklist
- [ ] League table loads and sorts correctly
- [ ] Matches filter by day and team
- [ ] Knockout bracket displays properly
- [ ] League switching updates all views
- [ ] Authentication works (login/signup/logout)
- [ ] Admin can edit/delete matches
- [ ] Offline mode works (disconnect network)
- [ ] PWA installs on mobile devices
- [ ] Responsive design on all screen sizes

### Automated Testing (Coming Soon)
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## ♿ Accessibility

This application follows WCAG 2.1 Level AA guidelines:

- ✅ Semantic HTML5 elements
- ✅ ARIA labels and roles
- ✅ Keyboard navigation support
- ✅ Focus management in modals
- ✅ Screen reader announcements
- ✅ Color contrast compliance
- ✅ Responsive text sizing

## 🌐 Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome  | 90+            |
| Firefox | 88+            |
| Safari  | 14+            |
| Edge    | 90+            |
| Opera   | 76+            |

**PWA Features** require HTTPS (except on localhost).

## 🐛 Known Issues

- [ ] Background video may cause performance issues on low-end devices
- [ ] iOS Safari has limited PWA capabilities
- [ ] Large match lists may cause scroll lag on mobile

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Code Style
- Use ES6+ features
- Follow existing naming conventions
- Add comments for complex logic
- Ensure accessibility standards are met

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Nekro** - *Initial work*

## 🙏 Acknowledgments

- UEFA for league logos and branding inspiration
- Supabase team for the excellent backend platform
- Open source community for various tools and libraries

## 📞 Support

For support, email support@efootball-georgia.com or open an issue in the repository.

## 🗺️ Roadmap

### Version 2.0 (Upcoming)
- [ ] TypeScript migration
- [ ] Automated testing suite
- [ ] Player statistics tracking
- [ ] Match highlights and videos
- [ ] Push notifications for match updates
- [ ] Dark/Light mode toggle
- [ ] Multi-language support (Georgian, English)
- [ ] Export league tables as images/PDF
- [ ] Social sharing integration
- [ ] Advanced analytics dashboard

### Version 1.5 (In Progress)
- [x] Performance optimizations
- [x] Enhanced accessibility
- [x] Better error handling
- [ ] Improved mobile experience
- [ ] Loading skeletons

---

**Made with ⚽ and ❤️ in Georgia**
