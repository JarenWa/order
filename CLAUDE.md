# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an order management and e-commerce admin system built with **uni-app** and **uniCloud** (Alibaba Cloud). It's based on the **uni-admin** framework (v2.5.13) and provides:
- Customer-facing mini-program (WeChat, Alipay, Toutiao) for shopping, orders, and points redemption
- Admin management backend for categories, goods, orders, and exchange items

## Tech Stack

- **Frontend**: uni-app (Vue 3), Vuex, vue-i18n
- **Backend**: uniCloud (Alibaba Cloud serverless), cloud functions
- **UI Components**: uni-ui, custom admin components
- **Database**: opendb schema-based collections

## Key Commands

This project uses HBuilderX for development. Key operations:
- **Run/Preview**: Use HBuilderX "Run" menu to preview on mini-program simulators or web
- **Build**: HBuilderX "Publish" menu for production builds
- **Cloud Functions**: Right-click `uniCloud-aliyun/cloudfunctions` in HBuilderX to upload cloud functions
- **Database**: Use uniCloud console or HBuilderX uniCloud panel for database operations

## Architecture

### Directory Structure
```
├── pages/                 # Main app pages (customer-facing)
├── pages/pages_admin/     # Admin management pages (sub-package)
├── components/            # Reusable Vue components
├── uniCloud-aliyun/
│   ├── cloudfunctions/    # Cloud functions (business logic)
│   └── database/          # Database schemas and init data
├── uni_modules/           # uni-app plugins (uni-id, uni-ui, etc.)
├── store/                 # Vuex state management
└── pages.json             # Page routing and tab bar config
```

### Cloud Functions
Business logic lives in `uniCloud-aliyun/cloudfunctions/`:
- `createOrder` - Create new order with inventory deduction
- `adminCompleteOrder` - Admin marks order as completed, grants points
- `adminUpdateOrder` - Admin modifies order items (status 0 only)
- `confirmReceive` - User confirms receipt
- `userUpdateOrder` - User updates order
- `createExchangeOrder` / `admin*ExchangeOrder` - Points redemption flow
- `uni-*` - System functions (uni-stat, uni-sms, uni-portal, etc.)

### Database Collections
Key collections (schemas in `uniCloud-aliyun/database/`):
- `uni-pay-orders` - Order data
- `opendb-mall-goods` - Product catalog
- `opendb-mall-categories` - Product categories
- `uni-id-users` - User accounts (managed by uni-id)
- `uni-id-address` - Shipping addresses
- `my_cart` - Shopping cart
- Exchange-related collections (custom redemption items)

### Page Routing
- Main tab bar: Home, Goods, Cart, User (`pages.json` tabBar)
- Admin pages: Sub-package at `pages/pages_admin/` with auth check in `main.js:15-22`
- Auth: uni-id-pages handles login/register/password reset

## Key Patterns

### Order Status Flow
- `0` - Pending payment
- `1` - Pending shipment  
- `2` - Pending receipt (shipped)
- `3` - Pending review
- `4` - Completed
- `-1` - Cancelled
- `-2` - User deleted

### Inventory Management
Cloud functions use atomic `db.command.inc()` for stock updates to prevent race conditions. Stock is deducted when order is created, restored when order is modified/cancelled.

### Points System
- Earned: 1 point per 100 fen (1 yuan) spent, calculated as `Math.ceil(totalAmount / 100)`
- Granted via `adminCompleteOrder` when admin marks order complete

### Admin Auth
Pages under `pages/pages_admin/` check for admin role via mixin in `main.js:12-24`. Role stored in `uni.getStorageSync('role')`.

## Configuration Files
- `admin.config.js` - Admin UI config (logo, menus, themes)
- `page.config.js` - Auto-generates admin CRUD pages from schema
- `manifest.json` - App config, mini-program appid, permissions
- `vue.config.js` - Webpack/Vue build config

## External Resources
- [uni-admin Documentation](https://uniapp.dcloud.net.cn/uniCloud/admin)
- [uniCloud Documentation](https://uniapp.dcloud.net.cn/uniCloud/README)
- [uni-id Documentation](https://uniapp.dcloud.net.cn/uniCloud/uni-id)
