# tapfour-site

Shopify Online Store 2.0 theme for Tapfour, built from the *Tapfour Site v3* design: NFC review stands, QR menus and the tapfour app.

The homepage builder adds the chosen hardware, add-ons, app plan and services to the Shopify cart in one step (`/cart/add.js`). The setup details go on the stand's line item as properties: business name, headline and tap URLs. Prices, compare-at prices and variant IDs come from your Shopify products.

## Set up the store

1. **Import products.** In Shopify admin, go to Products → Import and choose `products.csv`. This creates the 15 products the theme expects, with the right handles and variants. Then add product photos. The originals are in `assets/*.jpg`.
2. **Subscriptions.** `tapfour-app`, `tapfour-app-add-ons` and `managed-dashboard` are monthly or yearly. Install a subscription app such as Shopify Subscriptions and give each variant **exactly one** recurring selling plan. Until you do, the builder blocks those items instead of charging them once.
3. **Connect the theme.** Go to Online Store → Themes → Add theme → Connect from GitHub, then pick this repo and branch `main`. Pushes to `main` then sync automatically.
4. **Sale settings.** In Theme settings → Sale, set a real end date and stock count. If you leave them empty, the countdown and stock messages stay hidden.

Store currency should be PHP.

## Develop

```bash
npm ci
npm run preview        # local preview at http://localhost:3000 (sample catalog, no checkout)
npm test               # renders every route + drives the builder's add-to-cart in jsdom
npm run check          # Shopify Theme Check
npm run shopify:dev    # live dev against your store (needs `shopify` login)
```

CI (`.github/workflows/check.yml`) runs check, test, preview build and `shopify theme package` on every push.
