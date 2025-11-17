● Adding Custom Domain alikone.dev to Vercel

  Here's how to configure your custom domain:

  ---
  Step 1: Add Domain in Vercel Dashboard

  1. Go to Your Project
    - Navigate to your deployed project in Vercel
    - Click on Settings tab
  2. Add Domain
    - Click Domains in the left sidebar
    - Click Add button
    - Enter your domain: alikone.dev
    - Click Add
  3. Choose Configuration
    - Option A: Use as primary domain (recommended)
    - Option B: Redirect to another domain

  ---
  Step 2: Configure DNS (Choose Your Registrar)

  Vercel will show you which DNS records to add. Here are the options:

  Option A: Add A Record (Recommended)

  Add these DNS records at your domain registrar:

  Type: A
  Name: @ (or leave blank for root domain)
  Value: 76.76.21.21
  TTL: 3600 (or Auto)

  For www subdomain:
  Type: CNAME
  Name: www
  Value: cname.vercel-dns.com
  TTL: 3600

  Option B: Use Vercel Nameservers (Easiest)

  Change your domain's nameservers to:
  ns1.vercel-dns.com
  ns2.vercel-dns.com

  This gives Vercel full DNS control (recommended for simplicity).

  ---
  Step 3: Add Subdomain (Optional)

  If you want to use a subdomain like exam.alikone.dev:

  1. In Vercel:
    - Add domain: exam.alikone.dev
  2. In DNS:
  Type: CNAME
  Name: exam
  Value: cname.vercel-dns.com
  TTL: 3600

  ---
  Step 4: Enable HTTPS/SSL

  Vercel automatically provisions SSL certificates:
  - ✅ Free SSL from Let's Encrypt
  - ✅ Auto-renewal
  - ✅ Usually takes 1-5 minutes after DNS propagation

  ---
  Common DNS Registrars Configuration

  If using Cloudflare:

  1. Go to Cloudflare Dashboard
  2. Select alikone.dev
  3. Click DNS → Records
  4. Add the A record (76.76.21.21)
  5. Set proxy status to DNS only (gray cloud)

  If using Namecheap:

  1. Go to Domain List → Manage
  2. Click Advanced DNS
  3. Add new record:
    - Type: A Record
    - Host: @
    - Value: 76.76.21.21
    - TTL: Automatic

  If using GoDaddy:

  1. Go to DNS Management
  2. Add new record:
    - Type: A
    - Name: @
    - Value: 76.76.21.21
    - TTL: 600

  If using Google Domains:

  1. Go to DNS settings
  2. Add custom resource record:
    - Name: @
    - Type: A
    - TTL: 3600
    - Data: 76.76.21.21

  ---
  Step 5: Verify Domain

  1. Wait for DNS Propagation
    - Usually 5-30 minutes
    - Can take up to 48 hours in rare cases
  2. Check DNS Propagation
  # Check if DNS has propagated
  nslookup alikone.dev

  # Or use online tool
  # https://dnschecker.org
  3. Verify in Vercel
    - Vercel will show ✅ when domain is verified
    - SSL certificate will auto-provision

  ---
  Step 6: Set as Production Domain (Optional)

  If you want alikone.dev to be your primary domain:

  1. In Vercel Domains settings
  2. Find alikone.dev
  3. Click ••• (three dots)
  4. Select Set as Production Domain

  This redirects your .vercel.app URL to your custom domain.

  ---
  Recommended Setup

  For best practices, set up both root and www:

  alikone.dev → Your app (primary)
  www.alikone.dev → Redirects to alikone.dev

  Steps:
  1. Add alikone.dev as production domain
  2. Add www.alikone.dev
  3. Vercel auto-redirects www → non-www

  ---
  Troubleshooting

  Domain not verifying?

  # Check current DNS records
  dig alikone.dev

  # Check with Google DNS
  dig @8.8.8.8 alikone.dev

  Still showing old site?

  - Clear browser cache (Ctrl + Shift + Delete)
  - Try incognito mode
  - Check DNS propagation: https://dnschecker.org

  SSL not working?

  - Wait 5-10 minutes after DNS verification
  - Vercel auto-provisions SSL
  - Force refresh: Settings → Domains → Refresh SSL

  ---
  Quick Reference

  | Task               | Value                                |
  |--------------------|--------------------------------------|
  | Root Domain        | alikone.dev                          |
  | A Record Value     | 76.76.21.21                          |
  | CNAME Value        | cname.vercel-dns.com                 |
  | Vercel Nameservers | ns1.vercel-dns.comns2.vercel-dns.com |

  ---
  After Setup

  Your app will be accessible at:
  - ✅ https://alikone.dev (primary)
  - ✅ https://www.alikone.dev (redirects to primary)
  - ✅ https://your-project.vercel.app (redirects to primary if set)

  All with automatic HTTPS! 🎉

  ---
  Need help? Check Vercel's domain documentation: https://vercel.com/docs/concepts/projects/domains
