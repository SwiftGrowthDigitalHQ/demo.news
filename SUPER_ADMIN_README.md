# SangTX Super Admin Control Center

## 🎯 What is This?

The **Super Admin Control Center** is a complete platform management dashboard for the SangTX platform owner. It provides full control over all customer tenants, subscriptions, payments, and platform-wide settings.

**Think of it as:** The mission control for your entire SaaS platform.

---

## ✨ Key Features

### 📊 Platform Dashboard
- Real-time metrics: customers, revenue, trials, active subscriptions
- Growth analytics: new customers, churn rate
- Android app statistics
- Alerts for expiring/overdue subscriptions

### 👥 Customer Management
- View all customers in one place
- Search and filter by status, name, or email
- Activate, suspend, or cancel customer accounts
- Extend trial periods
- View customer content statistics

### 💳 Payment Approvals
- Manual UPI payment verification
- Approve or reject payment submissions
- View UTR, screenshots, and payment notes
- Automatic subscription activation on approval

### ⚙️ Platform Settings
- Configure UPI payment details
- Set subscription pricing (monthly/yearly)
- Manage Android app addon pricing
- Adjust trial and grace period durations

### 📋 Audit Logs
- Complete audit trail of all admin actions
- Track who did what and when
- Filter by entity type
- View detailed metadata

---

## 🚀 Quick Start

### 1. Prerequisites
- Supabase project configured
- Super admin role created in database
- User assigned super_admin role

### 2. Access
Navigate to: **`/super-admin`**

### 3. First Steps
1. Check the **Dashboard** for platform overview
2. Review **Customers** to see all tenants
3. Check **Payments** for any pending approvals
4. Verify **Settings** are correct

---

## 📖 Documentation

### For Platform Owners
- **[Quick Start Guide](docs/SUPER_ADMIN_QUICK_START.md)** - Get up and running in 5 minutes
- **[Implementation Report](docs/SUPER_ADMIN_IMPLEMENTATION_REPORT.md)** - Complete technical documentation

### For Developers
- **Architecture**: See `src/app/lib/superAdmin.ts` for data access layer
- **Components**: See `src/app/components/superadmin/` for UI components
- **Database**: See `supabase/migrations/20260812000001_super_admin_extensions.sql` for schema

---

## 🎨 Screenshots

### Dashboard View
```
┌─────────────────────────────────────────────────────────┐
│  📊 SangTX Super Admin - Platform Control Center        │
├─────────────────────────────────────────────────────────┤
│  [Dashboard] [Customers] [Payments] [Settings] [Audit]  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  👥 Total Customers: 25    ✅ Active: 18                │
│  🎯 Trial: 4               💰 Revenue: ₹98,765          │
│                                                           │
│  ⚠️ Expiring Soon (3)      🚨 Overdue (2)               │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Customer Management
```
┌─────────────────────────────────────────────────────────┐
│  Search: [________________] Status: [All Statuses ▾]     │
├─────────────────────────────────────────────────────────┤
│  Customer         Status    Plan      Expires           │
│  ────────────────────────────────────────────────────   │
│  Buxar News       ACTIVE    Monthly   Jan 15, 2027      │
│  Patna Today      TRIAL     Yearly    Dec 20, 2026      │
│  Bihar Express    PENDING   Monthly   -                 │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Security

### Access Control
- ✅ Only `super_admin` role can access
- ✅ Automatic redirect for unauthorized users
- ✅ Role verification on every request

### Data Protection
- ✅ Row Level Security (RLS) enforced
- ✅ Tenant data isolation maintained
- ✅ No direct content modification
- ✅ Audit trail for all actions

### Subscription Enforcement
- ✅ Expired subscriptions = access denied
- ✅ Customer data preserved (never deleted)
- ✅ Grace period for payment delays
- ✅ Manual reactivation by super admin

---

## 💡 Usage Examples

### Scenario 1: Customer Payment Received
1. Customer submits UPI payment via their admin panel
2. Payment appears in **Payments** tab as "Pending"
3. You verify UTR and approve payment
4. Customer subscription automatically activated
5. Action logged in audit trail

### Scenario 2: Trial Extension Request
1. Customer requests trial extension
2. Navigate to **Customers** tab
3. Find customer, click "View Details"
4. Click "Extend Trial", enter 7 days
5. Customer trial extended, notification sent

### Scenario 3: Overdue Suspension
1. Dashboard shows "Overdue" alert
2. Navigate to customer details
3. Verify payment not received
4. Click "Suspend" with reason "Payment overdue"
5. Customer access immediately denied
6. Data preserved for future reactivation

### Scenario 4: Pricing Update
1. Navigate to **Settings** tab
2. Update monthly price from ₹499 to ₹599
3. Confirm change affects new subscriptions only
4. Save settings
5. New customers see updated pricing

---

## 📈 Metrics Explained

### Customer Status
- **TRIAL**: Within free trial period (default 7 days)
- **ACTIVE**: Paid subscription, access granted
- **PAYMENT_DUE**: Trial ended, awaiting payment
- **PAYMENT_PENDING**: Payment submitted, awaiting approval
- **SUSPENDED**: Payment overdue, access denied
- **CANCELLED**: Customer voluntarily cancelled

### Revenue Types
- **Monthly Revenue**: Total from monthly subscriptions
- **Yearly Revenue**: Total from yearly subscriptions
- **Total Revenue**: Lifetime platform revenue

### Android App Status
- **NOT_REQUESTED**: Customer hasn't requested app
- **REQUESTED**: Customer submitted request
- **IN_PROGRESS**: App being developed
- **READY**: App ready for deployment
- **ACTIVE**: App live on Play Store

---

## 🛠️ Maintenance

### Regular Tasks
- **Daily**: Check pending payments, review alerts
- **Weekly**: Review new customers, check churn rate
- **Monthly**: Analyze revenue trends, update pricing if needed
- **Quarterly**: Review audit logs, generate reports

### Database Backups
- Supabase automatic backups enabled
- Manual backup before major changes
- Audit logs preserved for compliance

---

## 🆘 Support

### For Issues
1. Check the [Quick Start Guide](docs/SUPER_ADMIN_QUICK_START.md)
2. Review [Implementation Report](docs/SUPER_ADMIN_IMPLEMENTATION_REPORT.md)
3. Contact: `admin@sangtx.com`

### For Development
- See source code in `src/app/lib/superAdmin.ts`
- Check component implementations in `src/app/components/superadmin/`
- Review database schema in `supabase/migrations/`

---

## 📝 Changelog

### Version 1.0.0 (August 12, 2026)
- ✅ Initial release
- ✅ Dashboard with platform metrics
- ✅ Customer management with CRUD operations
- ✅ Payment approval workflow
- ✅ Platform settings management
- ✅ Audit logging system
- ✅ Android app status tracking
- ✅ Role-based access control
- ✅ Mobile-responsive UI

---

## 🎉 What's Next?

### Planned Features (Phase 2)
- Customer creation wizard from super admin
- Bulk customer actions (suspend multiple at once)
- Revenue analytics charts and graphs
- Automated email notifications
- CSV/PDF report exports
- Customer communication system
- Advanced filtering and search
- Performance optimizations (pagination, caching)

---

## 📄 License

This is a proprietary feature of the SangTX platform.  
© 2026 SangTX. All rights reserved.

---

**Built with**: React, TypeScript, Supabase, Tailwind CSS  
**Status**: Production-Ready ✅  
**Last Updated**: August 12, 2026
