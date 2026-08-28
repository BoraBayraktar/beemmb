"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  BadgeDollarSign,
  Bell,
  Barcode,
  CircleHelp,
  ChevronRight,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  DatabaseZap,
  FileOutput,
  FileClock,
  Files,
  FolderTree,
  GitCompare,
  HandCoins,
  Inbox,
  LayoutGrid,
  Landmark,
  Menu,
  Package,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  PlugZap,
  PieChart,
  ReceiptText,
  Scale,
  ScrollText,
  Search,
  ShieldCheck,
  Store,
  UserRound,
  Users,
  Warehouse,
  Wallet,
  Webhook,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { UserAccountMenu, type AccountMenuLabels } from "@/ui/admin/user-account-menu";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "beemmb-admin-sidebar-collapsed";
const ADMIN_THEME_STORAGE_KEY = "beemmb-admin-theme";

export type MenuItem = {
  href: string;
  label: string;
  children?: MenuItem[];
};

const adminMenuIcons: Array<{ route: string; icon: LucideIcon }> = [
  { route: "/admin/products", icon: Package },
  { route: "/admin/inventory/quick-actions", icon: Barcode },
  { route: "/admin/inventory/products", icon: PackageSearch },
  { route: "/admin/inventory/transactions", icon: ClipboardList },
  { route: "/admin/inventory/counts", icon: ClipboardCheck },
  { route: "/admin/inventory/warehouses", icon: Warehouse },
  { route: "/admin/inventory/exports", icon: FileOutput },
  { route: "/admin/inventory/external-events", icon: DatabaseZap },
  { route: "/admin/integrations/trendyol", icon: Store },
  { route: "/admin/integrations/n11", icon: Store },
  { route: "/admin/integrations/pazarama", icon: Store },
  { route: "/admin/inventory", icon: Boxes },
  { route: "/admin/product-questions", icon: ClipboardList },
  { route: "/admin/categories", icon: FolderTree },
  { route: "/admin/storefront", icon: LayoutGrid },
  { route: "/admin/orders", icon: ReceiptText },
  { route: "/admin/brands", icon: Users },
  { route: "/admin/cari", icon: Users },
  { route: "/admin/product-attributes", icon: ClipboardList },
  { route: "/admin/documents/pending-invoices", icon: FileClock },
  { route: "/admin/documents/providers", icon: PlugZap },
  { route: "/admin/documents/webhooks", icon: Webhook },
  { route: "/admin/documents", icon: Files },
  { route: "/admin/incoming-invoices/providers", icon: PlugZap },
  { route: "/admin/incoming-invoices", icon: Inbox },
  { route: "/admin/finance/reports/trial-balance", icon: Scale },
  { route: "/admin/finance/bank-reconciliation", icon: GitCompare },
  { route: "/admin/finance/ledger-entries", icon: BookOpen },
  { route: "/admin/finance/instruments", icon: ScrollText },
  { route: "/admin/finance/exports", icon: FileOutput },
  { route: "/admin/finance/payables", icon: HandCoins },
  { route: "/admin/finance/receivables", icon: BadgeDollarSign },
  { route: "/admin/finance/accounts", icon: Landmark },
  { route: "/admin/finance/bank-cash", icon: Landmark },
  { route: "/admin/finance/collections", icon: Wallet },
  { route: "/admin/finance/payments", icon: CreditCard },
  { route: "/admin/finance/transactions", icon: ReceiptText },
  { route: "/admin/finance/reports", icon: PieChart },
  { route: "/admin/finance", icon: BarChart3 },
  { route: "/admin/documents", icon: ReceiptText },
  { route: "/admin/integrations", icon: Workflow },
  { route: "/admin/customers", icon: Users },
  { route: "/admin/users", icon: UserRound },
  { route: "/admin/audit-logs", icon: ShieldCheck },
];

function resolveMenuIcon(href: string): LucideIcon {
  const matched = adminMenuIcons.find((entry) => href.includes(entry.route));
  return matched?.icon ?? LayoutGrid;
}

type Props = {
  locale: string;
  title: string;
  userName: string;
  userEmail: string;
  userRole: string;
  loadingLabel: string;
  accountMenu: AccountMenuLabels;
  storeLabel: string;
  notificationsLabel: string;
  noNotificationsLabel: string;
  markAllReadLabel: string;
  notificationProductQuestionCreatedTitle: string;
  notificationInventoryOutOfStockTitle: string;
  notificationInventoryLowStockTitle: string;
  notificationStockCountAppliedTitle: string;
  notificationStockCountAppliedMessage: string;
  menuItems: MenuItem[];
  children: React.ReactNode;
};

type NotificationItem = {
  id: string;
  type: "PRODUCT_QUESTION_CREATED" | "INVENTORY_ALERT_CREATED" | "STOCK_COUNT_APPLIED";
  title: string;
  message: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

type HelpGuideSection = {
  title: string;
  items: string[];
};

type HelpGuide = {
  eyebrow: string;
  title: string;
  description: string;
  sections: HelpGuideSection[];
};

function createGuide(guide: HelpGuide): HelpGuide {
  return guide;
}

function normalizeAdminPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const adminIndex = segments.indexOf("admin");

  if (adminIndex === -1) {
    return pathname;
  }

  return `/${segments.slice(adminIndex).join("/")}`;
}

function getActiveAdminGuide(pathname: string, searchParams: Pick<URLSearchParams, "get">): HelpGuide {
  const adminPath = normalizeAdminPath(pathname);
  const section = searchParams.get("section");

  if (/^\/admin\/orders\/[^/]+$/.test(adminPath)) {
    return createGuide({
      eyebrow: "Sipariş detayı rehberi",
      title: "Sipariş detay ekranı nasıl kullanılır?",
      description: "Bu ekran siparişin operasyonel merkezi olarak çalışır. Durum, ödeme, belge, stok ve finans etkisini aynı yerden izler ve yönetirsiniz.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce müşteri, sipariş durumu ve ödeme durumunu kontrol edin.",
            "Ürün satırlarını ve toplam tutarı doğrulayın.",
            "Belge alanında e-fatura veya e-irsaliye ihtiyacını kontrol edin.",
            "Tahsilat özeti eksikse tahsilat kaydı oluşturun.",
            "İptal veya iade gerekiyorsa durumu güncellemeden önce finans hesabını netleştirin.",
          ],
        },
        {
          title: "Bu ekranda yapılan kritik işlemler",
          items: [
            "Sipariş durumunu güncelleme",
            "Ödeme durumunu güncelleme",
            "Tahsilat kaydı başlatma",
            "İade sürecinde finans hesabı seçerek para çıkışı oluşturma",
            "Stok ve belge etkisini geçmiş hareketler üzerinden doğrulama",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "Belge eksikse Belgeler ekranına geçin.",
            "Tahsilat eksikse Tahsilatlar ekranına geçin.",
            "Stok iadesi veya hareket sorunu varsa Envanter hareketlerini açın.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/orders") {
    return createGuide({
      eyebrow: "Sipariş rehberi",
      title: "Siparişler ekranı nasıl kullanılır?",
      description: "Bu ekran sipariş havuzunu izlemek ve hangi kaydın aksiyon beklediğini bulmak için kullanılır. Asıl operasyon sipariş detayında tamamlanır.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce ödeme durumu ve iade durumu kritik olan siparişleri filtreleyin.",
            "Müşteri veya sipariş numarasına göre ilgili kaydı bulun.",
            "İşlem yapacağınız siparişi açıp detay ekranına geçin.",
          ],
        },
        {
          title: "Burada neye bakmalısınız?",
          items: [
            "Sipariş durumu",
            "Ödeme durumu",
            "Restok durumu",
            "Sipariş toplamı ve adet bilgisi",
          ],
        },
        {
          title: "Sipariş nereden oluşur?",
          items: [
            "Mağaza sepet/checkout akışı: Müşteri storefront tarafında sepete ürün ekleyip checkout yaptığında sipariş otomatik oluşuyor.",
            "Pazaryeri entegrasyonları: Trendyol, N11, Pazarama, Hepsiburada gibi entegrasyonlardan gelen paket/sipariş kayıtları eşleştirildikten sonra sistem içinde siparişe dönüştürülüyor.",
          ],
        },
        {
          title: "Sonraki adım",
          items: [
            "Belge veya tahsilat işlemi için sipariş detayına girin.",
            "İade veya iptal gerekiyorsa yine sipariş detayından ilerleyin.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/products") {
    return createGuide({
      eyebrow: "Ürün rehberi",
      title: "Ürünler ekranı nasıl kullanılır?",
      description: "Bu ekran satışa açılacak ürünleri hazırlamak için kullanılır. Ürün kartı burada hazırlanır, stok ve kanal hazırlığı sonraki ekranlarda tamamlanır.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce ürün temel bilgilerini, fiyatını ve durumunu girin.",
            "Kategori, marka, tedarikçi ve özellik eşleşmelerini tamamlayın.",
            "Varyantlı ürünlerde eksenleri ve varyant satırlarını oluşturun.",
            "Ürünü kaydettikten sonra stok hazırlığı için Envanter ekranına geçin.",
          ],
        },
        {
          title: "Bu ekranda yapılan işlemler",
          items: [
            "Yeni ürün oluşturma",
            "Varyant üretme ve düzenleme",
            "Ürün import veya export işlemleri",
            "Marketplace preflight ve ürün senkron hazırlığı",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "İlk stok için Envanter hızlı aksiyonlarına geçin.",
            "Kanal gönderimi için Entegrasyonlar veya ürün senkron alanını kullanın.",
            "Mağaza görünümü için Storefront ekranını kontrol edin.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/categories") {
    return createGuide({
      eyebrow: "Kategori rehberi",
      title: "Kategori yönetimi nasıl kullanılır?",
      description: "Bu ekran ürünlerin katalogda, vitrinde ve filtrelerde doğru gruplarda görünmesini sağlayan kategori ağacını yönetmek için kullanılır.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce ana kategori yapısını oluşturun.",
            "Alt kategorileri ürün ailesine göre sade ve anlaşılır şekilde bağlayın.",
            "Kategori adını, slug bilgisini ve sıralamasını kontrol edin.",
            "Ürün kartlarında doğru kategori seçildiğini Ürünler ekranından doğrulayın.",
          ],
        },
        {
          title: "Bu ekranda yapılan işlemler",
          items: [
            "Yeni kategori oluşturma",
            "Kategori adını ve sıralamasını düzenleme",
            "Aktif katalog yapısını sadeleştirme",
            "Ürünlerin mağaza tarafında hangi başlık altında görüneceğini hazırlama",
          ],
        },
        {
          title: "Dikkat edilmesi gerekenler",
          items: [
            "Aynı anlama gelen kategorileri çoğaltmayın.",
            "Kategori değişikliği ürün listeleme ve filtre deneyimini etkiler.",
            "Kategori silmeden veya pasifleştirmeden önce bağlı ürünleri kontrol edin.",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "Kategoriye ürün bağlamak için Ürünler ekranına geçin.",
            "Mağaza görünümünü kontrol etmek için Storefront ekranını açın.",
            "Marketplace kategori eşleşmesi gerekiyorsa Entegrasyonlar ekranına gidin.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/roles") {
    return createGuide({
      eyebrow: "Rol rehberi",
      title: "Rol yönetimi nasıl kullanılır?",
      description: "Bu ekran admin panelinde hangi kullanıcının hangi menüleri görebileceğini ve hangi işlemleri yapabileceğini merkezi olarak yönetir.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce hazır sistem rollerinden ihtiyacınızı karşılayan rol var mı kontrol edin.",
            "Yeni rol gerekiyorsa rol anahtarını kısa ve teknik, rol adını iş diliyle anlaşılır yazın.",
            "Rolün göreceği menü ve yapacağı işlemler için gerekli yetkileri seçin.",
            "Rolü kaydettikten sonra Kullanıcı Yönetimi ekranından ilgili kullanıcıya atayın.",
          ],
        },
        {
          title: "Dikkat edilmesi gerekenler",
          items: [
            "Menü görünürlüğü tek başına güvenlik değildir; API işlemleri de aynı yetki anahtarlarıyla korunur.",
            "Süper Yönetici rolü pasifleştirilemez ve yetkileri daraltılamaz.",
            "Kullanıcı kendi Süper Yönetici yetkisini kaldıramaz; sistemde son Süper Yönetici korunur.",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "Rol atamak için Kullanıcı Yönetimi ekranına geçin.",
            "Yetki değişikliklerini kontrol etmek için İşlem Kayıtları ekranını açın.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/brands") {
    return createGuide({
      eyebrow: "Marka rehberi",
      title: "Marka yönetimi nasıl kullanılır?",
      description: "Bu ekran ürün kartlarında kullanılan marka bilgisini merkezi olarak yönetir. Marka bilgisi katalog filtrelerinde, ürün detayında ve pazaryeri hazırlığında kullanılır.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce marka adını standart yazımla oluşturun.",
            "Aynı markanın farklı yazımlarını tek kayıtta toplayın.",
            "Ürünler ekranında ilgili ürünlere markayı bağlayın.",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "Ürüne marka bağlamak için Ürünler ekranını açın.",
            "Pazaryeri marka eşleşmesini kontrol etmek için Entegrasyonlar ekranına geçin.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/product-attributes") {
    return createGuide({
      eyebrow: "Ürün özellikleri rehberi",
      title: "Ürün özellikleri nasıl kullanılır?",
      description: "Bu ekran ürün kartlarında, filtrelerde ve varyant üretiminde kullanılan özellik tanımlarını yönetir.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce renk, beden, hacim gibi tekrar kullanılacak özellikleri tanımlayın.",
            "Varyant oluşturacak özellikleri ürün ekranında varyant ekseni olarak seçin.",
            "Filtre deneyimini sade tutmak için gereksiz özellik çoğaltmayın.",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "Özelliği ürüne bağlamak için Ürünler ekranına geçin.",
            "Marketplace attribute eşleşmesi için Entegrasyonlar ekranını kontrol edin.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/storefront") {
    return createGuide({
      eyebrow: "Storefront rehberi",
      title: "Storefront ekranı nasıl kullanılır?",
      description: "Bu ekran mağaza vitrininde hangi ürün ve içeriklerin öne çıkacağını yönetmek için kullanılır.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce satışa açık ve stok durumu uygun ürünleri belirleyin.",
            "Vitrin sıralamasını ve öne çıkarılan alanları düzenleyin.",
            "Mağaza tarafında ürünlerin doğru göründüğünü kontrol edin.",
          ],
        },
        {
          title: "Bağlı modüller",
          items: [
            "Ürün bilgileri Ürünler ekranından gelir.",
            "Stok uygunluğu Envanter ekranındaki değerlerden etkilenir.",
            "Kategori düzeni Kategori yönetimiyle birlikte çalışır.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/cari" || adminPath === "/admin/customers") {
    return createGuide({
      eyebrow: "Cari kart rehberi",
      title: "Cari kartlar nasıl kullanılır?",
      description: "Bu ekran müşteri, tedarikçi ve nakliyeci kayıtlarını tek bir cari kart üzerinden; sipariş, belge, ödeme ve tahsilat akışında kullanılacak şekilde yönetir.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce müşteri adını ve iletişim bilgisini kontrol edin.",
            "E-posta, telefon, vergi ve adres alanlarını belge ihtiyacına göre tamamlayın.",
            "Sipariş detayında müşteri bağlantısını doğrulayın.",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "Müşterinin siparişlerini görmek için Siparişler ekranına geçin.",
            "Açık tahsilatları görmek için Finans alacak ekranlarını kullanın.",
            "Belge bağlantıları için Belgeler ekranını açın.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/users") {
    return createGuide({
      eyebrow: "Kullanıcı rehberi",
      title: "Kullanıcı yönetimi nasıl kullanılır?",
      description: "Bu ekran yönetim paneline erişen kullanıcıları ve yönetici yetkilerini kontrol etmek için kullanılır.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce kullanıcının e-posta ve aktiflik durumunu kontrol edin.",
            "Admin yetkisi verilecek kullanıcıları dikkatli seçin.",
            "İşlem sonrası erişimi audit log ve kullanıcı listesi üzerinden doğrulayın.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/audit-logs") {
    return createGuide({
      eyebrow: "Audit log rehberi",
      title: "Audit log ekranı nasıl kullanılır?",
      description: "Bu ekran sistemde yapılan yönetim işlemlerini incelemek ve sorun araştırmalarında işlem geçmişini takip etmek için kullanılır.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce tarih, kullanıcı veya aksiyon tipine göre filtreleyin.",
            "Şüpheli kayıtta hedef modül ve işlem detayını inceleyin.",
            "Gerekirse ilgili modül ekranına dönüp kaydın güncel durumunu kontrol edin.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/inventory/quick-actions" || section === "quick-actions") {
    return createGuide({
      eyebrow: "Envanter hızlı aksiyon rehberi",
      title: "Hızlı aksiyonlar ekranı nasıl kullanılır?",
      description: "Bu ekran barkod, SKU veya ürün aramasıyla en hızlı stok operasyonunu başlatmak için tasarlanır. Günlük fiziksel operasyon burada hız kazanır.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Barkod, SKU veya ürün adı ile kaydı bulun.",
            "Doğru depoyu ve işlem tipini seçin.",
            "Miktarı girin ve sonucu hemen uygulayın.",
            "Ardından hareket geçmişi veya senkron özetini kontrol edin.",
          ],
        },
        {
          title: "En sık kullanım senaryoları",
          items: [
            "Hızlı stok girişi",
            "Hızlı stok çıkışı",
            "Ürün bazlı anlık kontrol",
            "Sayım sonrası fark kapatma",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "Ayrıntılı hareket kontrolü için Envanter hareketleri ekranına geçin.",
            "Senkron sorunu varsa Entegrasyonlar ekranını açın.",
          ],
        },
      ],
    });
  }

  if (adminPath.startsWith("/admin/inventory")) {
    return createGuide({
      eyebrow: "Envanter rehberi",
      title: "Envanter ekranları nasıl kullanılır?",
      description: "Bu alan stok durumunu izlemek, stok hareketi başlatmak, depo ve sayım süreçlerini yönetmek için kullanılır.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce özet ve kritik stok alanlarından aksiyon bekleyen ürünleri bulun.",
            "Stok girişi, çıkışı veya transfer gerekiyorsa Hızlı Aksiyonlar ekranına geçin.",
            "Sayım farkı varsa Sayımlar ekranında kapsamı doğrulayıp uygulayın.",
            "Sonucu Hareketler ekranında kontrol edin.",
          ],
        },
        {
          title: "Kontrol noktaları",
          items: [
            "Eldeki stok",
            "Rezerve stok",
            "Depo bazlı dağılım",
            "Son hareket ve dış kanal senkron durumu",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "Dış kanal farkı varsa Entegrasyonlar ekranına gidin.",
            "Ürün kartı eksikse Ürünler ekranını açın.",
            "Satış etkisini görmek için Siparişler ekranına geçin.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/documents/pending-invoices") {
    return createGuide({
      eyebrow: "Bekleyen fatura rehberi",
      title: "Bekleyen faturalar ekranı nasıl kullanılır?",
      description: "Bu ekran irsaliyeden faturaya geçiş bekleyen operasyonları toplar. Fatura oluşturma öncesi eksik kayıtları yakalamak için kullanılır.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce hangi siparişlerin faturaya dönmesi gerektiğini kontrol edin.",
            "Kaynağı açıp sipariş ve müşteri bilgisini doğrulayın.",
            "Uygun belgeyi oluşturun ve ardından belge durumunu izleyin.",
          ],
        },
        {
          title: "Kontrol noktaları",
          items: [
            "Sipariş bağlantısı",
            "Müşteri hesabı",
            "İrsaliye kaydı",
            "Dış sistem gönderim durumu",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "Belge detayları için Belgeler ekranına geçin.",
            "Sipariş doğrulaması gerekiyorsa Sipariş detayını açın.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/documents/providers") {
    return createGuide({
      eyebrow: "Belge provider rehberi",
      title: "Belge sağlayıcıları nasıl kullanılır?",
      description: "Bu ekran e-fatura ve e-irsaliye gönderiminde kullanılacak dış belge sağlayıcı ayarlarını yönetir.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce aktif ve varsayılan provider kaydını kontrol edin.",
            "Gönderim bilgileri, kullanıcı adı ve gizli anahtar alanlarını doğrulayın.",
            "Belge gönderimi sorunlarında provider kaydını ve dış sistem durumunu birlikte inceleyin.",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "Gönderilecek belge için Belgeler ekranına geçin.",
            "Dış sistem dönüşlerini görmek için Webhook ekranını açın.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/documents/webhooks") {
    return createGuide({
      eyebrow: "Belge webhook rehberi",
      title: "Webhook kayıtları nasıl kullanılır?",
      description: "Bu ekran dış belge sisteminden gelen durum bildirimlerini izlemek ve belge gönderim problemlerini takip etmek için kullanılır.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce başarısız veya bekleyen webhook kayıtlarını bulun.",
            "İlgili belge numarası ve provider bilgisini doğrulayın.",
            "Belge durumunu Belgeler ekranında tekrar kontrol edin.",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "Belge kaydı için Belgeler ekranına dönün.",
            "Provider ayarı şüpheli ise Belge sağlayıcıları ekranını açın.",
          ],
        },
      ],
    });
  }

  if (adminPath.startsWith("/admin/documents")) {
    return createGuide({
      eyebrow: "Belge rehberi",
      title: "Belgeler ekranı nasıl kullanılır?",
      description: "Bu ekran siparişe veya stok işlemine bağlı ticari belgeleri oluşturmak, bağlamak ve dış sisteme göndermek için kullanılır.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Belge tipine göre sipariş veya stok işlemi kaynağını seçin.",
            "Tedarikçi ya da müşteri hesabını doğrulayın.",
            "Belgeyi oluşturun veya düzenleyin.",
            "Gönderim kuyruğuna alın ve dış sistem durumunu izleyin.",
          ],
        },
        {
          title: "Bu ekranda yapılan işlemler",
          items: [
            "Belge oluşturma",
            "Belge düzenleme",
            "Provider seçimi",
            "Gönderim ve durum senkronu",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "Sipariş doğrulaması için Sipariş detayına dönün.",
            "Gönderim sorunu varsa Provider veya Webhook ekranlarını açın.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/finance/collections" || /^\/admin\/finance\/collections\/[^/]+$/.test(adminPath)) {
    return createGuide({
      eyebrow: "Tahsilat rehberi",
      title: "Tahsilatlar ekranı nasıl kullanılır?",
      description: "Bu ekran açık alacakları görmek ve sipariş bazında tahsilat kaydı oluşturmak için kullanılır. Tahsilat burada başlar, sipariş ödeme etkisi sipariş tarafında görünür.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce kalan tutarı olan siparişleri bulun.",
            "Doğru finans hesabını seçin.",
            "Tahsilat kaydını oluşturun.",
            "Ardından sipariş kaynağına dönüp ödeme durumunu kontrol edin.",
          ],
        },
        {
          title: "Kontrol etmeniz gerekenler",
          items: [
            "Kalan tutar",
            "Kayıtlı tahsilat sayısı",
            "Ödeme başarısız veya yetkilendirilmiş durumları",
            "Doğru banka veya kasa hesabı",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "Sipariş detayına dönerek finans özetini doğrulayın.",
            "Tüm hareketleri görmek için Banka/Nakit veya İşlem hareketleri ekranını açın.",
          ],
        },
      ],
    });
  }

  if (adminPath === "/admin/finance/receivables" || /^\/admin\/finance\/receivables\/[^/]+$/.test(adminPath)) {
    return createGuide({
      eyebrow: "Alacak rehberi",
      title: "Alacaklar ekranı nasıl kullanılır?",
      description: "Bu ekran siparişlerden doğan açık alacakları ve ödeme bekleyen kayıtları finans bakışıyla izlemek için kullanılır.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce ödeme durumu açık veya başarısız olan siparişleri bulun.",
            "Kalan tutarı ve müşteri bilgisini doğrulayın.",
            "Tahsilat gerekiyorsa Tahsilatlar ekranından kayıt oluşturun.",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "Tahsilat için Tahsilatlar ekranına geçin.",
            "Sipariş kaynağını görmek için Sipariş detayını açın.",
            "Finans hareketi kontrolü için İşlem hareketleri ekranını kullanın.",
          ],
        },
      ],
    });
  }

  if (adminPath.startsWith("/admin/finance")) {
    return createGuide({
      eyebrow: "Finans rehberi",
      title: "Finans ekranları nasıl kullanılır?",
      description: "Bu alan alacak, borç, tahsilat, ödeme, banka/kasa ve rapor işlemlerini birlikte yönetir.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce alacak veya borç listesinde açık kaydı bulun.",
            "Tahsilat veya ödeme işlemini ilgili ekrandan oluşturun.",
            "Banka/Kasa ve İşlem hareketlerinde kaydın finans etkisini kontrol edin.",
            "Dönemsel kontrol için rapor ekranlarına geçin.",
          ],
        },
        {
          title: "Bağlı modüller",
          items: [
            "Siparişler alacak ve tahsilat kaynağıdır.",
            "Belgeler ticari evrak bağlantısını taşır.",
            "Tedarikçiler borç ve ödeme akışında kullanılır.",
          ],
        },
      ],
    });
  }

  if (adminPath.startsWith("/admin/integrations")) {
    return createGuide({
      eyebrow: "Entegrasyon rehberi",
      title: "Entegrasyonlar ekranı nasıl kullanılır?",
      description: "Bu ekran dış kanallarla veri akışını izlemek, kuyruk işlemlerini yönetmek ve hatalı job kayıtlarını çözmek için kullanılır.",
      sections: [
        {
          title: "Önerilen sıra",
          items: [
            "Önce özet kartlardan sıkışan durumları seçin.",
            "Failed ve dead letter kayıtlarını öncelikli inceleyin.",
            "Job detayında payload ve hata mesajını okuyun.",
            "Gerekli düzeltmeyi ilgili modülde yapıp retry başlatın.",
          ],
        },
        {
          title: "Bu ekranda çözülen başlıklar",
          items: [
            "Ürün, fiyat ve stok senkronu",
            "Sipariş içeri alma",
            "Belge gönderimi",
            "Kuyruk ve tekrar deneme yönetimi",
          ],
        },
        {
          title: "Sonraki gidilecek ekranlar",
          items: [
            "Ürün hatalarında Ürünler ekranına gidin.",
            "Sipariş kaynaklı sorunlarda Siparişler ekranına geçin.",
            "Belge hatalarında Belgeler ekranını açın.",
          ],
        },
      ],
    });
  }

  return createGuide({
    eyebrow: "Admin rehberi",
    title: "Bu sayfa nasıl kullanılmalı?",
    description: "Bulunduğunuz ekran BEEMMB içindeki bir operasyon adımını yönetir. En doğru kullanım için önce hedef kaydı bulun, ardından bağlı modüllere geçerek süreci tamamlayın.",
    sections: [
      {
        title: "Genel sıra",
        items: [
          "Önce ilgili kaydı veya problemi bulun.",
          "Durum ve bağlı verileri doğrulayın.",
          "Aksiyonu doğru modülde tamamlayın.",
          "Sonucu ilgili kaynak ekranda tekrar kontrol edin.",
        ],
      },
      {
        title: "Bağlı modüller",
        items: [
          "Siparişler operasyon merkezi olarak çalışır.",
          "Belgeler ticari evrak akışını yönetir.",
          "Finans tahsilat ve iade hareketlerini yönetir.",
          "Entegrasyonlar dış sistem akışını izler.",
        ],
      },
    ],
  });
}

export function AdminPanelShell({
  locale,
  title,
  userName,
  userEmail,
  userRole,
  loadingLabel,
  accountMenu,
  storeLabel,
  notificationsLabel,
  noNotificationsLabel,
  markAllReadLabel,
  notificationProductQuestionCreatedTitle,
  notificationInventoryOutOfStockTitle,
  notificationInventoryLowStockTitle,
  notificationStockCountAppliedTitle,
  notificationStockCountAppliedMessage,
  menuItems,
  children,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [openMenuGroups, setOpenMenuGroups] = useState<Record<string, boolean>>({});
  const [menuSearch, setMenuSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const loadingNotificationsRef = useRef(false);

  useEffect(() => {
    if (window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- must read the collapse preference after mount so SSR/hydration output stays identical (always expanded on first paint); a pre-hydration blocking script was ruled out as unnecessary complexity here.
      setCollapsed(true);
    }

    if (window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY) === "dark") {
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  async function loadNotifications() {
    if (loadingNotificationsRef.current) {
      return;
    }

    loadingNotificationsRef.current = true;
    setLoadingNotifications(true);
    try {
      const response = await fetch("/api/admin/notifications?page=1&pageSize=8", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        items?: NotificationItem[];
        unreadCount?: number;
      };
      setNotifications(payload.items ?? []);
      setUnreadCount(payload.unreadCount ?? 0);
    } finally {
      loadingNotificationsRef.current = false;
      setLoadingNotifications(false);
    }
  }

  useEffect(() => {
    if (document.visibilityState !== "visible") {
      return undefined;
    }

    const initialTimer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    let interval: number | null = null;

    const startInterval = () => {
      if (interval !== null) {
        window.clearInterval(interval);
      }

      interval = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          void loadNotifications();
        }
      }, 90000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadNotifications();
        startInterval();
        return;
      }

      if (interval !== null) {
        window.clearInterval(interval);
        interval = null;
      }
    };

    startInterval();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(initialTimer);
      if (interval !== null) {
        window.clearInterval(interval);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const onOutsidePointer = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    window.addEventListener("mousedown", onOutsidePointer);
    return () => {
      window.removeEventListener("mousedown", onOutsidePointer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNotificationsOpen(false);
      setMobileMenuOpen(false);
      setHelpOpen(false);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname]);

  async function markNotificationAsRead(notificationId: string) {
    let decremented = false;
    setNotifications((prev) => prev.map((item) => {
      if (item.id !== notificationId) {
        return item;
      }

      if (!item.readAt) {
        decremented = true;
      }

      return { ...item, readAt: item.readAt ?? new Date().toISOString() };
    }));
    if (decremented) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    await fetch(`/api/admin/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  }

  async function markAllAsRead() {
    setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);

    await fetch("/api/admin/notifications/read-all", {
      method: "PATCH",
    });
  }

  function resolveLocalizedLink(linkUrl: string | null) {
    if (!linkUrl) {
      return null;
    }

    if (linkUrl.startsWith("/admin")) {
      return `/${locale}${linkUrl}`;
    }

    return linkUrl;
  }

  function resolveNotificationContent(item: NotificationItem) {
    if (item.type === "STOCK_COUNT_APPLIED") {
      const match = item.message.match(/^(.+?) was applied with transaction (.+?)\.$/);

      return {
        title: notificationStockCountAppliedTitle,
        message: match
          ? notificationStockCountAppliedMessage
            .replaceAll("{countNumber}", match[1] ?? "")
            .replaceAll("{transactionNumber}", match[2] ?? "")
          : notificationStockCountAppliedTitle,
      };
    }

    if (item.type === "INVENTORY_ALERT_CREATED") {
      const isOutOfStock = item.title === "Inventory out of stock alert";
      const isLowStock = item.title === "Inventory low stock alert";

      return {
        title: isOutOfStock
          ? notificationInventoryOutOfStockTitle
          : isLowStock
            ? notificationInventoryLowStockTitle
            : item.title,
        message: item.message,
      };
    }

    if (item.type === "PRODUCT_QUESTION_CREATED" && item.title.startsWith("New question for ")) {
      return {
        title: `${notificationProductQuestionCreatedTitle}: ${item.title.replace("New question for ", "")}`,
        message: item.message,
      };
    }

    return {
      title: item.title,
      message: item.message,
    };
  }

  function isMenuItemActive(item: MenuItem): boolean {
    const url = new URL(item.href, "http://localhost");
    const section = url.searchParams.get("section");
    const itemPath = url.pathname;

    if (section) {
      return pathname === itemPath && searchParams.get("section") === section;
    }

    if (item.children?.length) {
      return pathname === itemPath || item.children.some((child) => isMenuItemActive(child));
    }

    return pathname === itemPath;
  }

  function renderMenuItem(item: MenuItem, depth = 0, compact = false): ReactElement {
    const active = isMenuItemActive(item);
    const hasChildren = Boolean(item.children?.length);
    const MenuIcon = resolveMenuIcon(item.href);
    const searchingMenu = menuSearch.trim().length > 0;

    if (hasChildren) {
      const isOpen = searchingMenu || (openMenuGroups[item.href] ?? active);

      return (
        <div key={item.href} className="space-y-1">
          <button
            type="button"
            onClick={() => {
              setOpenMenuGroups((current) => ({
                ...current,
                [item.href]: !(current[item.href] ?? active),
              }));
            }}
            className={cn(
              "flex w-full items-center rounded-lg text-left font-medium transition-colors",
              compact ? "h-10 px-2.5 text-[14px]" : "h-11 px-3 text-[15px]",
              depth > 0 && (compact ? "pl-9" : "pl-10"),
              active
                ? "bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)] shadow-none"
                : isOpen
                  ? "bg-[color:var(--color-bg-soft)] text-[color:var(--color-text)]"
                  : "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-soft)]/80",
            )}
            aria-expanded={isOpen}
          >
            <MenuIcon className={cn("mr-3 shrink-0 text-[color:var(--color-text-muted)]", compact ? "h-4 w-4" : "h-4 w-4")} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 text-[color:var(--color-text-muted)] transition-transform duration-200",
                isOpen ? "rotate-90" : "rotate-0",
              )}
              aria-hidden="true"
            />
          </button>
          <div className={cn(isOpen ? "block" : "hidden")}>
            <div className="space-y-0.5 pt-1">
              {item.children?.map((child) => renderMenuItem(child, depth + 1, compact))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex w-full items-center rounded-lg font-normal transition-colors",
          compact ? "h-10 px-2.5 text-[14px]" : "h-11 px-3 text-[15px]",
          depth > 0 && (compact ? "h-10 pl-9" : "h-10 pl-10 text-[14px]"),
          active
            ? "bg-[color:var(--color-brand)]/10 font-medium text-[color:var(--color-brand)] shadow-none"
            : "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-soft)]/80 hover:text-[color:var(--color-text)]",
        )}
      >
        <MenuIcon className={cn("mr-3 shrink-0 text-[color:var(--color-text-muted)]", compact ? "h-4 w-4" : "h-4 w-4")} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </Link>
    );
  }

  function renderCollapsedMenuItem(item: MenuItem): ReactElement {
    const active = isMenuItemActive(item);
    const hasChildren = Boolean(item.children?.length);
    const MenuIcon = resolveMenuIcon(item.href);

    const iconButtonClassName = cn(
      "mx-auto flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
      active
        ? "bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)]"
        : "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-soft)] hover:text-[color:var(--color-text)]",
    );

    const trigger = hasChildren ? (
      <button
        type="button"
        aria-label={item.label}
        onClick={() => {
          setCollapsed(false);
          setOpenMenuGroups((current) => ({ ...current, [item.href]: true }));
        }}
        className={iconButtonClassName}
      >
        <MenuIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    ) : (
      <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={iconButtonClassName}>
        <MenuIcon className="h-4 w-4" aria-hidden="true" />
      </Link>
    );

    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  function filterMenuTree(item: MenuItem, query: string): MenuItem | null {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

    if (!normalizedQuery) {
      return item;
    }

    const selfMatches = item.label.toLocaleLowerCase("tr-TR").includes(normalizedQuery);
    const filteredChildren = item.children
      ?.map((child) => filterMenuTree(child, normalizedQuery))
      .filter((child): child is MenuItem => child !== null);

    if (selfMatches) {
      return {
        ...item,
        children: filteredChildren,
      };
    }

    if (filteredChildren && filteredChildren.length > 0) {
      return {
        ...item,
        children: filteredChildren,
      };
    }

    return null;
  }

  const visibleMenuItems = menuItems
    .map((item) => filterMenuTree(item, menuSearch))
    .filter((item): item is MenuItem => item !== null);
  const activeGuide = getActiveAdminGuide(pathname, searchParams);
  const userInitial = userName.trim().charAt(0).toUpperCase() || "?";

  return (
    <main className={cn("min-h-screen bg-[color:var(--color-bg-soft)]", isDark && "dark")} style={{ colorScheme: isDark ? "dark" : "light" }}>
      <div className="mx-auto flex min-h-screen max-w-screen-2xl items-start gap-3 px-2 py-2">
        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Mobil menüyü kapat"
              className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="absolute left-0 top-0 flex h-full w-[min(88vw,332px)] flex-col overflow-hidden rounded-r-[24px] border-r border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl">
              <Card className="flex h-full flex-col rounded-none border-0 shadow-none">
                <CardHeader className="space-y-3 border-b border-[color:var(--color-border)] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]">
                        <Store className="h-4 w-4 text-[color:var(--color-text-muted)]" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base text-[color:var(--color-text)]">Backoffice</CardTitle>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} aria-label="Kapat">
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-text-muted)]" />
                    <Input
                      value={menuSearch}
                      onChange={(event) => setMenuSearch(event.target.value)}
                      placeholder="Ara"
                      className="h-10 rounded-xl border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] pl-9 text-sm shadow-none focus-visible:ring-[color:var(--color-border)]"
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-4 pt-0">
                  <div className="shrink-0 border-b border-[color:var(--color-border)] px-4 py-3">
                    <p className="truncate text-sm font-semibold text-[color:var(--color-text)]">{userName}</p>
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-[color:var(--color-text-muted)]">
                      <p className="truncate">{userEmail}</p>
                      <Badge variant="secondary" className="shrink-0 rounded-md bg-[color:var(--color-bg-soft)] uppercase text-[color:var(--color-text-muted)]">{userRole}</Badge>
                    </div>
                  </div>

                  <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 py-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
                    {visibleMenuItems.map((item) => renderMenuItem(item, 0, true))}
                  </nav>

                  <div className="shrink-0 px-4">
                    <Separator className="mb-3 bg-[color:var(--color-border)]" />
                    <div className="grid gap-2">
                      <Button asChild variant="secondary" className="h-10 justify-between rounded-xl">
                        <Link href={`/${locale}`} onClick={() => setMobileMenuOpen(false)}>
                          {storeLabel}
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                      <UserAccountMenu locale={locale} labels={accountMenu} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        ) : null}

        <TooltipProvider delayDuration={200}>
          <aside
            className={cn(
              "hidden shrink-0 transition-[width] duration-300 ease-in-out lg:sticky lg:top-0 lg:block lg:h-screen lg:min-h-0",
              collapsed ? "lg:w-[76px]" : "lg:w-[280px]",
            )}
          >
            <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-none border-y-0 border-l-0 border-r border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-none">
              <CardHeader
                className={cn(
                  "border-b border-[color:var(--color-border)] px-4 py-4",
                  collapsed ? "flex flex-col items-center gap-2" : "space-y-3",
                )}
              >
                {collapsed ? (
                  <>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]">
                      <Store className="h-4 w-4 text-[color:var(--color-text-muted)]" />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Menüyü genişlet"
                      title="Menüyü genişlet"
                      onClick={() => setCollapsed(false)}
                    >
                      <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]">
                        <Store className="h-4 w-4 text-[color:var(--color-text-muted)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-base text-[color:var(--color-text)]">Backoffice</CardTitle>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Menüyü daralt"
                          title="Menüyü daralt"
                          onClick={() => setCollapsed(true)}
                        >
                          <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-text-muted)]" />
                      <Input
                        value={menuSearch}
                        onChange={(event) => setMenuSearch(event.target.value)}
                        placeholder="Ara"
                        className="h-10 rounded-xl border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] pl-9 text-sm shadow-none focus-visible:ring-[color:var(--color-border)]"
                      />
                    </div>
                  </>
                )}
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 px-0 pb-0 pt-0">
                <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-3 [scrollbar-width:thin]">
                  {collapsed
                    ? visibleMenuItems.map((item) => renderCollapsedMenuItem(item))
                    : visibleMenuItems.map((item) => renderMenuItem(item))}
                </nav>
              </CardContent>
              <div
                className={cn(
                  "shrink-0 border-t border-[color:var(--color-border)] p-3",
                  collapsed ? "flex flex-col items-center gap-2 px-2" : "flex items-center gap-3",
                )}
              >
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand)]/10 text-sm font-semibold text-[color:var(--color-brand)]">
                        {userInitial}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">{userName}</TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand)]/10 text-sm font-semibold text-[color:var(--color-brand)]">
                      {userInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[color:var(--color-text)]">{userName}</p>
                      <p className="truncate text-xs text-[color:var(--color-text-muted)]">{userRole}</p>
                    </div>
                  </>
                )}
                <UserAccountMenu locale={locale} labels={accountMenu} />
              </div>
            </Card>
          </aside>
        </TooltipProvider>

        <section className="grid min-h-0 min-w-0 flex-1 content-start gap-4">
          <header className="flex h-[72px] items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2">
            <div className="min-w-0 flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2 lg:hidden">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Menüyü aç"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Menü</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle
                isDark={isDark}
                onToggle={() => setIsDark((current) => !current)}
                className="border border-[color:var(--color-border)] bg-transparent text-[color:var(--color-text)]"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Sayfa yardımı"
                title="Sayfa yardımı"
                onClick={() => setHelpOpen(true)}
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
              <div className="relative" ref={notificationRef}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={notificationsLabel}
                  title={notificationsLabel}
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                      {Math.min(unreadCount, 99)}
                    </span>
                  ) : null}
                </Button>

                {notificationsOpen ? (
                  <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
                      <p className="text-sm font-semibold text-neutral-900">{notificationsLabel}</p>
                      <Button type="button" variant="ghost" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
                        {markAllReadLabel}
                      </Button>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {loadingNotifications ? (
                        <p className="px-3 py-3 text-sm text-neutral-500">{loadingLabel}</p>
                      ) : notifications.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-neutral-500">{noNotificationsLabel}</p>
                      ) : (
                        notifications.map((item) => {
                          const localizedLink = resolveLocalizedLink(item.linkUrl);
                          const notificationContent = resolveNotificationContent(item);
                          const content = (
                            <>
                              <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{notificationContent.title}</p>
                              <p className="line-clamp-2 text-xs text-neutral-600">{notificationContent.message}</p>
                            </>
                          );

                          if (!localizedLink) {
                            return (
                              <button
                                key={item.id}
                                type="button"
                                className="grid w-full gap-1 border-b border-neutral-100 px-3 py-2 text-left hover:bg-neutral-50"
                                onClick={() => markNotificationAsRead(item.id)}
                              >
                                {content}
                              </button>
                            );
                          }

                          return (
                            <Link
                              key={item.id}
                              href={localizedLink}
                              className="grid gap-1 border-b border-neutral-100 px-3 py-2 hover:bg-neutral-50"
                              onClick={() => {
                                void markNotificationAsRead(item.id);
                                setNotificationsOpen(false);
                              }}
                            >
                              {content}
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <Button asChild variant="outline" size="icon">
                <Link href={`/${locale}`} aria-label={storeLabel} title={storeLabel}>
                  <Store className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </header>

          <div className="grid min-w-0 grid-cols-1 gap-4">{children}</div>
        </section>
      </div>

      {helpOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Yardım panelini kapat"
            className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
            onClick={() => setHelpOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-neutral-200 bg-white shadow-2xl">
            <div className="border-b border-neutral-200 bg-[radial-gradient(circle_at_top_right,_rgba(14,116,144,0.12),_transparent_52%),radial-gradient(circle_at_left,_rgba(245,158,11,0.10),_transparent_40%)] px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{activeGuide.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{activeGuide.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">{activeGuide.description}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setHelpOpen(false)} aria-label="Kapat">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-4">
                {activeGuide.sections.map((sectionItem) => (
                  <section key={sectionItem.title} className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4">
                    <h3 className="text-sm font-semibold text-neutral-950">{sectionItem.title}</h3>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-700">
                      {sectionItem.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
