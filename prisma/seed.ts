import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

type SeedProductFeature = {
  key: string;
  value: string;
  highlighted?: boolean;
};

function encodeDescriptionWithFeatures(description: string, features: SeedProductFeature[]) {
  const normalized = features
    .map((feature) => ({
      key: feature.key.trim(),
      value: feature.value.trim(),
      highlighted: Boolean(feature.highlighted),
    }))
    .filter((feature) => feature.key && feature.value);

  if (normalized.length === 0) {
    return description;
  }

  const payload = Buffer.from(JSON.stringify(normalized), "utf8").toString("base64");
  return `${description}\n\n<!--AT_FEATURES:${payload}-->`;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  const adminPasswordHash = await hash("Admin123!", 10);
  const editorPasswordHash = await hash("Editor123!", 10);
  const customerPasswordHash = await hash("Customer123!", 10);

  await prisma.user.upsert({
    where: {
      email: "admin@beemmb.local",
    },
    update: {
      name: "BEEMMB Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      deleted: false,
      deletedDate: null,
      deletedUserId: null,
    },
    create: {
      tenantId: "tenant-beemmb-platform",
      email: "admin@beemmb.local",
      name: "BEEMMB Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: {
      email: "customer@beemmb.local",
    },
    update: {
      name: "BEEMMB Customer",
      passwordHash: customerPasswordHash,
      role: "CUSTOMER",
      deleted: false,
      deletedDate: null,
      deletedUserId: null,
    },
    create: {
      tenantId: "tenant-beemmb-platform",
      email: "customer@beemmb.local",
      name: "BEEMMB Customer",
      passwordHash: customerPasswordHash,
      role: "CUSTOMER",
    },
  });

  await prisma.user.upsert({
    where: {
      email: "editor@beemmb.local",
    },
    update: {
      name: "BEEMMB Editor",
      passwordHash: editorPasswordHash,
      role: "EDITOR",
      deleted: false,
      deletedDate: null,
      deletedUserId: null,
    },
    create: {
      tenantId: "tenant-beemmb-platform",
      email: "editor@beemmb.local",
      name: "BEEMMB Editor",
      passwordHash: editorPasswordHash,
      role: "EDITOR",
    },
  });

  const categories = [
    { slug: "elektronik", name: "Elektronik" },
    { slug: "ev-yasam", name: "Ev ve Yasam" },
    { slug: "spor", name: "Spor" },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { tenantId_slug: { tenantId: "tenant-beemmb-platform", slug: category.slug } },
      update: {
        name: category.name,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
      create: { ...category, tenantId: "tenant-beemmb-platform" },
    });
  }

  const elektronik = await prisma.category.findUniqueOrThrow({
    where: { tenantId_slug: { tenantId: "tenant-beemmb-platform", slug: "elektronik" } },
  });
  const evYasam = await prisma.category.findUniqueOrThrow({
    where: { tenantId_slug: { tenantId: "tenant-beemmb-platform", slug: "ev-yasam" } },
  });
  const spor = await prisma.category.findUniqueOrThrow({
    where: { tenantId_slug: { tenantId: "tenant-beemmb-platform", slug: "spor" } },
  });

  const subcategories = [
    { slug: "telefon-tablet", name: "Telefon ve Tablet", parentId: elektronik.id },
    { slug: "ses-goruntu", name: "Ses ve Goruntu", parentId: elektronik.id },
    { slug: "mobilya", name: "Mobilya", parentId: evYasam.id },
    { slug: "ev-tekstili", name: "Ev Tekstili", parentId: evYasam.id },
    { slug: "fitness", name: "Fitness", parentId: spor.id },
    { slug: "yoga-pilates", name: "Yoga ve Pilates", parentId: spor.id },
  ];

  for (const category of subcategories) {
    await prisma.category.upsert({
      where: { tenantId_slug: { tenantId: "tenant-beemmb-platform", slug: category.slug } },
      update: {
        name: category.name,
        parentId: category.parentId,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
      create: { ...category, tenantId: "tenant-beemmb-platform" },
    });
  }

  const products = [
    {
      slug: "akilli-saat-pro-x2",
      sku: "ASPX2-001",
      name: "Akilli Saat Pro X2",
      description:
        "1.9 in AMOLED ekran, 7 gun pil omru ve gelismis aktivite takibi sunan premium akilli saat.",
      price: "5499.90",
      compareAtPrice: "6299.90",
      stock: 18,
      imageUrl:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
      categoryId: elektronik.id,
      features: [
        { key: "Ekran", value: "1.9 in AMOLED", highlighted: true },
        { key: "Pil Omru", value: "7 Gun", highlighted: true },
        { key: "Su Gecirmezlik", value: "5 ATM", highlighted: true },
        { key: "Baglanti", value: "Bluetooth 5.3" },
        { key: "GPS", value: "Var" },
        { key: "Renk", value: "Siyah" },
      ],
    },
    {
      slug: "kablosuz-kulaklik-airpulse",
      sku: "KKAIR-002",
      name: "Kablosuz Kulaklik AirPulse",
      description:
        "Aktif gurultu engelleme, dusuk gecikme modu ve 32 saate kadar pil omru sunan TWS kulaklik.",
      price: "2899.00",
      compareAtPrice: "3399.00",
      stock: 26,
      imageUrl:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
      categoryId: elektronik.id,
      features: [
        { key: "Tip", value: "TWS", highlighted: true },
        { key: "Aktif Gurultu Engelleme", value: "Var", highlighted: true },
        { key: "Pil Omru", value: "32 Saat", highlighted: true },
        { key: "Codec", value: "AAC" },
        { key: "Renk", value: "Beyaz" },
      ],
    },
    {
      slug: "ergonomik-calisma-koltugu",
      sku: "ECKOLT-003",
      name: "Ergonomik Calisma Koltugu",
      description:
        "Bel destegi ve nefes alan kumas dokusuyla uzun sureli konfor odakli ofis koltugu.",
      price: "7999.00",
      compareAtPrice: null,
      stock: 9,
      imageUrl:
        "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=1200&q=80",
      categoryId: evYasam.id,
      features: [
        { key: "Tip", value: "Ofis Koltugu", highlighted: true },
        { key: "Bel Destegi", value: "Ayarlanabilir", highlighted: true },
        { key: "Kumas", value: "Nefes Alan", highlighted: true },
        { key: "Renk", value: "Gri" },
        { key: "Mensei", value: "TR" },
      ],
    },
    {
      slug: "yoga-mat-premium",
      sku: "YMPREM-004",
      name: "Yoga Mat Premium",
      description:
        "Kaymaz yuzey, 6 mm destek ve ter tutmayan kaplama ile ev antrenmanlari icin ideal mat.",
      price: "1199.50",
      compareAtPrice: "1499.50",
      stock: 35,
      imageUrl: "/yoga-mat-premium.svg",
      categoryId: spor.id,
      features: [
        { key: "Kalınlik", value: "6 mm", highlighted: true },
        { key: "Yuzey", value: "Kaymaz", highlighted: true },
        { key: "Malzeme", value: "TPE", highlighted: true },
        { key: "Renk", value: "Mor" },
        { key: "Mensei", value: "CN" },
      ],
    },
  ];

  const communitySeedBySlug: Record<string, {
    reviews: Array<{
      authorName: string;
      rating: number;
      title: string;
      comment: string;
      verifiedPurchase: boolean;
      daysAgo: number;
    }>;
    questions: Array<{
      question: string;
      askedBy: string;
      askedDaysAgo: number;
      answer?: string;
      answeredBy?: string;
      answeredDaysAgo?: number;
    }>;
  }> = {
    "akilli-saat-pro-x2": {
      reviews: [
        {
          authorName: "Merve K.",
          rating: 5,
          title: "Bekledigimden daha iyi",
          comment: "Ekran parlakligi ve pil suresi gunluk kullanimda cok iyi. Spor takibi de basarili.",
          verifiedPurchase: true,
          daysAgo: 4,
        },
        {
          authorName: "Ahmet T.",
          rating: 4,
          title: "Fiyat performans urunu",
          comment: "Bildirimler hizli geliyor. Kayis kalitesi de iyi, genel olarak memnunum.",
          verifiedPurchase: true,
          daysAgo: 8,
        },
        {
          authorName: "Elif Y.",
          rating: 5,
          title: "Tasarim premium",
          comment: "Kutudan ciktigi anda kaliteli hissettiriyor. Uygulama kurulumu da kolaydi.",
          verifiedPurchase: false,
          daysAgo: 13,
        },
      ],
      questions: [
        {
          question: "iOS ile sorunsuz calisiyor mu?",
          askedBy: "Burak A.",
          askedDaysAgo: 10,
          answer: "Evet, iOS 16 ve sonrasi surumlerde uygulama ile tam uyumlu calisir.",
          answeredBy: "BEEMMB Support",
          answeredDaysAgo: 9,
        },
        {
          question: "GPS surekli acikken pil suresi ne kadar?",
          askedBy: "Can O.",
          askedDaysAgo: 6,
          answer: "Surekli GPS kullaniminda senaryoya gore 1-2 gun arasi degisebilir.",
          answeredBy: "BEEMMB Support",
          answeredDaysAgo: 5,
        },
      ],
    },
    "kablosuz-kulaklik-airpulse": {
      reviews: [
        {
          authorName: "Zeynep D.",
          rating: 5,
          title: "ANC performansi guzel",
          comment: "Toplu tasimada gurultuyu iyi kesiyor. Sarj kutusu da cok hizli doluyor.",
          verifiedPurchase: true,
          daysAgo: 3,
        },
        {
          authorName: "Ayse N.",
          rating: 4,
          title: "Gunluk kullanim icin ideal",
          comment: "Ses dengesi iyi, mikrofon performansi da toplantilar icin yeterli.",
          verifiedPurchase: true,
          daysAgo: 11,
        },
      ],
      questions: [
        {
          question: "Tek kulaklik modunda kullanilabiliyor mu?",
          askedBy: "Mert S.",
          askedDaysAgo: 7,
          answer: "Evet, sag veya sol kulakligi tek basina kullanabilirsiniz.",
          answeredBy: "BEEMMB Support",
          answeredDaysAgo: 6,
        },
      ],
    },
    "ergonomik-calisma-koltugu": {
      reviews: [
        {
          authorName: "Sinan G.",
          rating: 5,
          title: "Bel destegi basarili",
          comment: "Uzun calisma saatlerinde bel agrimi azaltti. Kurulumu da zor degildi.",
          verifiedPurchase: true,
          daysAgo: 9,
        },
      ],
      questions: [
        {
          question: "Maksimum tasima kapasitesi nedir?",
          askedBy: "Derya P.",
          askedDaysAgo: 12,
          answer: "Urunun maksimum onerilen tasima kapasitesi 120 kg'dir.",
          answeredBy: "BEEMMB Support",
          answeredDaysAgo: 10,
        },
      ],
    },
    "yoga-mat-premium": {
      reviews: [
        {
          authorName: "Gizem U.",
          rating: 4,
          title: "Kaymazlik iyi",
          comment: "Evde yoga seanslarinda zeminde sabit kaliyor. Malzeme kokusu yok denecek kadar az.",
          verifiedPurchase: true,
          daysAgo: 5,
        },
      ],
      questions: [
        {
          question: "Dis mekanda kullanim icin uygun mu?",
          askedBy: "Onur E.",
          askedDaysAgo: 8,
        },
      ],
    },
  };

  const seededProductIds: Array<{ id: string; slug: string }> = [];

  for (const product of products) {
    const upserted = await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: "tenant-beemmb-platform", slug: product.slug } },
      update: {
        sku: product.sku,
        name: product.name,
        description: encodeDescriptionWithFeatures(product.description, product.features),
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        stock: product.stock,
        imageUrl: product.imageUrl,
        categoryId: product.categoryId,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
      create: {
        tenantId: "tenant-beemmb-platform",
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        description: encodeDescriptionWithFeatures(product.description, product.features),
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        stock: product.stock,
        imageUrl: product.imageUrl,
        categoryId: product.categoryId,
        currency: "TRY",
      },
    });

    seededProductIds.push({ id: upserted.id, slug: upserted.slug });
  }

  for (const item of seededProductIds) {
    const community = communitySeedBySlug[item.slug];
    if (!community) {
      continue;
    }

    await prisma.productReview.deleteMany({
      where: {
        productId: item.id,
      },
    });

    await prisma.productQuestion.deleteMany({
      where: {
        productId: item.id,
      },
    });

    if (community.reviews.length > 0) {
      await prisma.productReview.createMany({
        data: community.reviews.map((review) => ({
          tenantId: "tenant-beemmb-platform",
          productId: item.id,
          authorName: review.authorName,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          verifiedPurchase: review.verifiedPurchase,
          createdAt: daysAgo(review.daysAgo),
          deleted: false,
        })),
      });
    }

    if (community.questions.length > 0) {
      await prisma.productQuestion.createMany({
        data: community.questions.map((question) => ({
          tenantId: "tenant-beemmb-platform",
          productId: item.id,
          question: question.question,
          askedBy: question.askedBy,
          answer: question.answer ?? null,
          answeredBy: question.answeredBy ?? null,
          answeredAt: typeof question.answeredDaysAgo === "number" ? daysAgo(question.answeredDaysAgo) : null,
          createdAt: daysAgo(question.askedDaysAgo),
          deleted: false,
        })),
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
