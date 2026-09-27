# Tap4 software roadmap: making the admin + owner dashboard match the landing page

Written 2026-09-28, against landing page commit `82ee8ff` and platform `bc89381`. **Status update the same day: see §0.**

The landing page (tap4.ph) now sells **monthly app plans** (Solo ₱299 · Business ₱799 · Empire ₱1,999), **stand packages**
(5 / 20 / 80 Review + Menu stands) and a **table-ordering add-on**. This document compares every promise with what the software
does today, then plans the smallest reliable way to close each gap.

---

## 0. Status (2026-09-28): what's built, what's blocked

**Built, tested and live** (admin.tap4.ph / dashboard.tap4.ph / go.tap4.ph):

| Item | Where |
|---|---|
| A · Plan & add-ons per client (plan, billing, package, table-ordering status, active/cancelled); owner menu adapts to the plan | Admin → client → *Plan & add-ons*; `migrations/0003_app_modules.sql` |
| C · **Live QR menu**: editor (add, edit, sold-out toggle, remove, paste a whole menu as text) + guest menu page `go.tap4.ph/menu/<client>`; a Menu tap/QR or links-page Menu button opens it when no menu link is saved | Owner → *Menu*; `src/modules.js`, `views-app.js`, `menuPage` |
| D · **Billing tracker**: late / this week / unpaid, “Paid ✓” rolls monthly bills forward | Owner → *Billing* |
| E · **Inventory tracker**: − / + / set, low-stock warnings | Owner → *Inventory* |
| B · **Branches** (Business 5, Empire 20): taps per branch, rename carries to stands/bills/stock/staff | Owner → *Branches* |
| F · **Staff tracker** (Empire): roster, days, shift times, status now (PH time) | Owner → *Staff* |
| G · Busiest hours + % vs previous 30 days | Owner Home, admin client page |
| H · **Monthly report**: any month, print / save as PDF | Owner → *Reports* |
| Home “Needs you”: bills due this week, low stock, staff on shift | Owner → *Home* |
| Dashboard styles decoupled from the storefront: `src/base.css` (frozen copy) at `/tapfour-app.css` | The storefront redesign had removed ~25 classes the dashboard used |

Admins open any client’s modules as the owner from *Plan & add-ons* (“Set up their app” buttons). The menu-setup service = staff paste
the customer’s menu as text there.

**Blocked: needs a decision, an account or hardware (§7):**

| Item | Blocked on |
|---|---|
| J · Tap-to-join Wi-Fi (1–2 h) + “guests in now / avg stay / returning” | Router choice (captive portal) and whether Tap4 supplies it |
| K · Order from the table | Which counter device (client’s own tablet vs supplied); then ~1–2 weeks build on top of the live menu |
| I · Review alerts | Google Maps API key (Cloud billing card) |
| H+ · Monthly report **emailed** on the 1st, bill-due reminders, owner “forgot password” | An email sender (e.g. Resend) + domain records |
| L · Shopify orders inbox (auto-create client/stands/plan) | Shopify custom-app token with order read access |
| Menu item photos | Image storage decision (R2 needs a card on Cloudflare; KV works for small photos) |
| Storefront copy for not-yet-live items (Wi-Fi, table ordering) | Your call: “coming soon” or keep selling with a setup date |

Not built on purpose yet: menu item re-ordering (items keep the order they were added; sections by first item), plan limits on
the number of menu items (none needed), staff clock-in by NFC tag (after the roster is used).

---

## 1. Promise vs reality

| Landing page promise | Where | Today | Gap |
|---|---|---|---|
| **Tap for reviews**: review, follow, like, watch | Every plan | ✅ Taps, links page, Maps-link → review link | none |
| **Live QR menu**: edit prices, hide sold-out | Every plan (“included”) | ❌ Menu is just an external link. Checkout can upload a menu file (KV), but no hosted menu or editor | **Big: sold as included** |
| **Dashboard**: taps, guests, bills and stock | Every plan | 🟡 Taps & scans only | Guests ❌, bills ❌, stock ❌ |
| Billing tracker | Solo+ | ❌ | **Sold as included** |
| Inventory tracker | Solo+ | ❌ | **Sold as included** |
| **Tap-to-join Wi-Fi**, 1 or 2 h per guest | Every plan | ❌ | **Hardest item**: needs a router (see §4 J) |
| “Guests in now / avg stay 46m / busiest hours / returning 41%” | App section demo | ❌ (busiest hours is doable from taps today) | Guest numbers need Wi-Fi sessions |
| Dashboard for up to 5 / 20 branches | Business / Empire | 🟡 A free-text “branch” on each stand | Real branches, branch view, limits |
| Review alerts | Business+ | ❌ | Needs Google data (§4 I) |
| Monthly report PDF | Business+ | ❌ | Printable report + email |
| Billing & inventory across branches | Empire | ❌ | Follows from branches + trackers |
| Staff tracker (name, branch, shift, status) | Empire | ❌ | New module |
| **Order from the table** (add-on, quoted, from ₱499/mo) | Add-on | ❌ | Largest build: guest ordering + live counter view |
| “Cancel anytime: taps never check your plan” | Plans | ✅ Redirects never look at plans | none |
| Packages: 5 / 20 / 80 stands | Plans | ✅ Add up to 100 stands at once | Package isn’t recorded on the client |
| Services: page build, menu setup, Google profile, social pack, managed dashboard | Services | 🟡 Staff can do most via admin + “View as owner” | No task tracking; menu setup needs the menu editor |
| Priority chat / dedicated manager | Business / Empire | Process, not software | Show a contact on the owner’s Help page per plan |

**The honest problem:** customers paying ₱299/mo from day one expect the **menu editor, billing tracker, inventory tracker and Wi-Fi**,
because the page says they’re included. Until each is live, either ship it before selling that plan, or have the storefront label it
“coming soon”. Your call (see §7).

---

## 2. Principles (unchanged)

- **Taps never break.** New features live beside the redirect path, never inside it.
- **One Worker, one database.** New tables in D1; no new services unless a feature truly needs one (called out below).
- **Plain words, phone first,** same design system. Owners run this from a phone behind a counter.
- **Gate by plan, not by code forks.** Each client has a plan; the dashboard shows or hides modules from that.

---

## 3. Owner dashboard: target navigation (matches the landing page samples)

| Solo | Business | Empire | + Table ordering |
|---|---|---|---|
| Home · My stands · **Menu** · **Billing** · **Inventory** · **Wi-Fi** · My links · Help | Home · **Branches** · My stands · Menu · Billing · Inventory · Wi-Fi · My links · **Reports** · Help | Business + **Staff** | adds **Orders** (live floor) after Home |

Admin gets matching pages to set these up for a client, and “View as owner” keeps working for managed-dashboard clients.

---

## 4. Feature plans

Effort is **S** ≈ 1–2 days, **M** ≈ 3–5 days, **L** ≈ 1–2+ weeks (build + test), for one developer with this codebase.

### A. Plan & add-ons on every client: S (do first)
- **Admin:** each client gets a *Plan* (Solo / Business / Empire / none), *billing* (monthly/yearly), *package* (5/20/80 or none),
  *table ordering* (no / quote requested / quoted ₱x / active), *Wi-Fi* (none / set up) and *status* (active / cancelled).
- **Owner:** sees only the modules their plan includes; branch limits come from the plan.
- **Data:** columns on `businesses`. Later filled from Shopify (L).
- Why first: every other module needs to know the plan.

### B. Branches: M (Business / Empire)
- A `branches` table (name, address). Stands, bills, stock and staff belong to a branch.
- **Owner:** a branch switcher (All / Main / BGC …), and a **Branches** page comparing taps per branch (the landing sample).
- **Admin:** add branches up to the plan limit (5 / 20); the existing free-text branch migrates into it.

### C. Live QR menu: M (**highest priority, sold as included**)
- **Menu editor** (owner + admin): categories → items (name, short note, price, *sold out* toggle, order). Big buttons, phone first.
  “Hide sold-out” = one tap.
- **Public menu page** at `go.tap4.ph/m/<business>` in the site’s own menu design (the phone mock on the landing page).
  Branch-specific prices later if needed.
- **Stands:** a “Menu” tap or QR opens the hosted menu automatically when the client has one (no link to paste).
  Menu opens are already counted.
- **Admin “Menu setup” service:** the checkout already uploads the customer’s menu photo/PDF to KV; show those files on the client
  page next to the editor so staff can type it in.
- **Item photos:** phase 2 (needs image storage; R2 or KV, see §7).
- This is also the foundation for table ordering (K).

### D. Billing tracker: S
- Bills: name, branch, amount, due date, *repeats monthly*, paid ✓.
- **Home:** “Due this week: 2 · ₱48.2k”. **Billing** page: list, mark paid, next month auto-created for repeating bills.
- Later: reminder email the day before (needs email sending, see §7).

### E. Inventory tracker: S
- Items: name, branch, unit, amount left, “low when below”. Quick − / + buttons, “restocked” button.
- **Home:** “Needs you: Oat milk low (3 L)”. Empire: across branches.

### F. Staff tracker: M (Empire)
- Staff: name, branch, role; weekly shifts; today’s status (on shift / later / off).
- MVP is a roster the owner maintains. **Tap4 twist, later:** a staff NFC card or tag at the counter to clock in/out,
  reusing the tap system, so the tracker fills itself.

### G. Better numbers from data we already have: S
- Busiest hours (from tap/scan times), this month vs last month, per-stand and per-branch comparisons.
- No new collection needed.

### H. Monthly report PDF: S → M (Business+)
- A printable report page (like the supplier QR sheet): taps, scans, what people opened, busiest hours, best branch, menu views,
  review changes. **Save as PDF** works today.
- Auto-emailed on the 1st of each month once email sending exists (§7).

### I. Review alerts: M (Business+)
- **Realistic version:** once a day, check each client’s **Google rating and review count** (Places API, needs `GOOGLE_MAPS_KEY`)
  and alert: “+3 new Google reviews, rating 4.6 → 4.7”, on the dashboard (and by email later).
- **Full review text + replying** needs the **Google Business Profile API** with the owner’s permission (Google approval required).
  Keep that for the *Managed dashboard* service, not the MVP.
- Stays honest: we still never claim reviews came from taps.

### J. Tap-to-join Wi-Fi (1 or 2 h per guest): L + hardware (**decision needed**)
What the page shows needs **a router that supports a captive portal**. An NFC chip or QR alone can’t limit time:
- **iPhones can’t join Wi-Fi from an NFC tag at all**, and a Wi-Fi QR code shares the password forever.
- **Proper version:** tap4 hosts the “Join YourShop-Guest, free for 1 hour” page. A supported router (e.g. TP-Link Omada or MikroTik)
  asks tap4 to allow each guest for 1–2 h. Guests tap the stand or scan the QR to open that page.
- This is also what makes **“guests in now / avg stay / returning”** real: each Wi-Fi session is a guest visit.
  Returning guests need a consent line on the join page (Data Privacy Act).
- **Stop-gap if needed:** a printed Wi-Fi QR (no time limit, no guest numbers). Only sell it as that.

### K. Order from the table: L (add-on, quoted)
- **Tables:** each table gets its own QR, reusing stands and QR slots (`/q/<code>/t4` style), printed as table cards
  from the supplier files page.
- **Guest:** scans → hosted menu (C) with *Add* buttons → *Send to server*; *Call server*, *Bill please*, *Refill* buttons.
- **Counter tablet / server phone:** a live **Orders** floor (tiles: free / new order / in kitchen / served / bill please),
  a sound on new orders, one tap to accept → kitchen → served.
- **Real-time:** MVP polls every 3 s (simple, reliable). Upgrade to Cloudflare Durable Objects (live connections) when busy.
  Phone notifications later via installable web app.
- **Admin:** a quote inbox (tables, type of place, busyness from the landing form) → set price → activate.
- Payment stays at the counter (no online payments in MVP).

### L. Admin operations: M
- **Orders inbox:** Shopify orders arrive automatically (webhook) and become a draft client with stands, design, package, plan and
  Google Maps link filled in. Staff review and confirm. Needs a Shopify custom app token (§7).
- **Services queue:** page build / menu setup / Google profile / social pack / managed dashboard as tasks per client (to do → done).
- **Subscriptions:** plan status visible per client; cancelled clients keep working stands (as promised) but lose app modules.

---

## 5. New data (D1 tables)

`branches` · `menus`, `menu_items` · `bills` · `stock_items` · `staff`, `shifts` · `review_snapshots` · `wifi_sessions` ·
`table_orders`, `table_order_items` · `shopify_orders` · `tasks` · plan columns on `businesses`.
All are scoped by `business_id`, and owners only ever see their own (same rule as today).

---

## 6. Phases

| Phase | Goal | Contents | Rough size |
|---|---|---|---|
| **1 · Make “included in every plan” true** | What a ₱299 Solo customer bought works | A plan on client · **C live menu** · D billing · E inventory · G busiest hours · owner nav per plan | ~2–3 weeks |
| **2 · Business & Empire** | Multi-branch plans deliver | B branches · H monthly PDF · I review alerts · F staff tracker · L orders inbox + tasks | ~3 weeks |
| **3 · Add-ons that need hardware / real-time** | Table ordering + Wi-Fi | K table ordering (quote → active) · J Wi-Fi with a chosen router + guest numbers | ~3–5 weeks + hardware pilot |
| **Later / not now** | | Replying to Google reviews in-app, POS integration, online payments at the table, menu item photos (if not done in C) | |

Phase 1 alone fixes most of the “sold but missing” risk.

---

## 7. Decisions needed

1. **Until built:** should the storefront mark menu editor / billing / inventory / Wi-Fi as **“coming soon”**, or hold sales of plans?
2. **Wi-Fi:** which router do we standardise on (and is it bundled / rented / customer-owned)? Or sell the printed Wi-Fi QR stop-gap
   honestly for now?
3. **Google key** for review alerts and name search: needs a Google Cloud billing card (usage stays inside the free allowance).
4. **Email sending** for monthly reports, bill reminders, review alerts and owner password resets. Resend is already set up in
   another project and would fit.
5. **Shopify API access** (custom app with read orders) for the automatic orders inbox.
6. **Menu item photos:** yes in Phase 1 (adds image storage) or text-only menu first?
7. **Table ordering devices:** does the client use their own tablet/phone at the counter, or does Tap4 supply one?
