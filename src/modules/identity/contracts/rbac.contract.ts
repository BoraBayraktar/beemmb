export const RBAC_PERMISSIONS = [
  { key: "admin.access", module: "admin", action: "access", menuKey: null, name: "Admin panele erişim" },
  { key: "users.manage", module: "users", action: "manage", menuKey: "users", name: "Kullanıcı ve rol yönetimi" },
  { key: "audit.read", module: "audit", action: "read", menuKey: "audit-logs", name: "İşlem kayıtlarını görüntüleme" },
  { key: "audit.export", module: "audit", action: "export", menuKey: "audit-logs", name: "İşlem kayıtlarını dışa aktarma" },
  { key: "products.read", module: "products", action: "read", menuKey: "products", name: "Ürünleri görüntüleme" },
  { key: "products.manage", module: "products", action: "manage", menuKey: "products", name: "Ürünleri yönetme" },
  { key: "orders.read", module: "orders", action: "read", menuKey: "orders", name: "Siparişleri görüntüleme" },
  { key: "orders.manage", module: "orders", action: "manage", menuKey: "orders", name: "Siparişleri yönetme" },
  { key: "inventory.read", module: "inventory", action: "read", menuKey: "inventory", name: "Stokları görüntüleme" },
  { key: "inventory.manage", module: "inventory", action: "manage", menuKey: "inventory", name: "Stokları yönetme" },
  { key: "documents.read", module: "documents", action: "read", menuKey: "documents", name: "Belgeleri görüntüleme" },
  { key: "documents.manage", module: "documents", action: "manage", menuKey: "documents", name: "Belgeleri yönetme" },
  { key: "finance.read", module: "finance", action: "read", menuKey: "finance", name: "Finansı görüntüleme" },
  { key: "finance.manage", module: "finance", action: "manage", menuKey: "finance", name: "Finansı yönetme" },
  { key: "finance.audit.read", module: "finance", action: "audit_read", menuKey: "finance-exports", name: "Mali müşavir export paketi" },
  { key: "integrations.read", module: "integrations", action: "read", menuKey: "integrations", name: "Entegrasyonları görüntüleme" },
  { key: "integrations.manage", module: "integrations", action: "manage", menuKey: "integrations", name: "Entegrasyonları yönetme" },
] as const;

export type PermissionKey = (typeof RBAC_PERMISSIONS)[number]["key"];

export const ALL_PERMISSION_KEYS = RBAC_PERMISSIONS.map((permission) => permission.key) as PermissionKey[];

export const RBAC_SYSTEM_ROLES = [
  {
    key: "super-admin",
    name: "Süper Yönetici",
    description: "BEEMMB genelindeki tüm menü, API ve güvenlik yönetimi yetkilerine sahiptir.",
    permissions: ALL_PERMISSION_KEYS,
    legacyRoles: ["ADMIN"],
  },
  {
    key: "operation",
    name: "Operasyon",
    description: "Ürün, sipariş, stok ve belge süreçlerini günlük operasyon için yönetir.",
    permissions: [
      "admin.access",
      "products.read",
      "products.manage",
      "orders.read",
      "orders.manage",
      "inventory.read",
      "inventory.manage",
      "documents.read",
      "documents.manage",
      "integrations.read",
    ],
    legacyRoles: ["EDITOR"],
  },
  {
    key: "auditor",
    name: "Denetçi",
    description: "İşlem kayıtları ve kritik kayıtları salt okunur izler.",
    permissions: ["admin.access", "audit.read", "products.read", "orders.read", "inventory.read", "documents.read", "finance.read", "integrations.read"],
    legacyRoles: [],
  },
  {
    key: "finance",
    name: "Finans",
    description: "Tahsilat, ödeme, cari ve finans raporlarını yönetir.",
    permissions: ["admin.access", "orders.read", "documents.read", "finance.read", "finance.manage", "finance.audit.read"],
    legacyRoles: [],
  },
  {
    key: "accountant",
    name: "Mali Müşavir",
    description: "Finans raporlarını salt okunur görür ve muhasebe export paketi indirir.",
    permissions: ["admin.access", "documents.read", "finance.read", "finance.audit.read"],
    legacyRoles: [],
  },
  {
    key: "catalog-manager",
    name: "Katalog Yöneticisi",
    description: "Ürün, kategori, marka ve vitrin katalog süreçlerini yönetir.",
    permissions: ["admin.access", "products.read", "products.manage", "inventory.read", "integrations.read"],
    legacyRoles: [],
  },
  {
    key: "integration-manager",
    name: "Entegrasyon Yöneticisi",
    description: "Pazaryeri ve dış sistem bağlantılarını yönetir.",
    permissions: ["admin.access", "products.read", "orders.read", "inventory.read", "integrations.read", "integrations.manage"],
    legacyRoles: [],
  },
] as const;

export type RbacRoleSummary = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissionKeys: string[];
  userCount: number;
};

export type EffectiveRbac = {
  roleKeys: string[];
  roleNames: string[];
  permissionKeys: PermissionKey[];
};
