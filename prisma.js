generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  FARMER
  BUYER
  ADMIN
}

model User {
  id           String   @id @default(uuid())
  name         String
  phone        String   @unique
  email        String?  @unique
  passwordHash String
  role         Role
  location     String?
  county       String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  listings      Listing[]       @relation("FarmerListings")
  soilChecks    SoilCheck[]
  diseaseChecks DiseaseCheck[]
  historyLogs   HistoryLog[]
  inquiries     Inquiry[]       @relation("BuyerInquiries")
  payments      Payment[]

  @@index([role])
}

model SoilProfile {
  id             String   @id @default(uuid())
  soilType       String   @unique // e.g. "Loam", "Clay", "Sandy", "Silt", "Volcanic (Andosol)"
  description    String
  recommendedFor Json     // array of { crop, suitability, yieldPerAcreKg }
  createdAt      DateTime @default(now())
}

model SoilCheck {
  id         String   @id @default(uuid())
  user       User     @relation(fields: [userId], references: [id])
  userId     String
  soilType   String
  acreage    Float
  result     Json     // computed crop + yield recommendations returned to user
  createdAt  DateTime @default(now())

  @@index([userId])
}

model DiseaseCheck {
  id           String   @id @default(uuid())
  user         User     @relation(fields: [userId], references: [id])
  userId       String
  imageUrl     String
  targetType   String   // "leaf" | "soil"
  diagnosis    String
  confidence   Float
  advice       String
  createdAt    DateTime @default(now())

  @@index([userId])
}

model Listing {
  id           String    @id @default(uuid())
  farmer       User      @relation("FarmerListings", fields: [farmerId], references: [id])
  farmerId     String
  cropName     String
  quantityKg   Float
  pricePerKg   Float
  location     String
  county       String
  contactPhone String
  status       String    @default("ACTIVE") // ACTIVE | SOLD | EXPIRED
  boostedUntil DateTime? // set when an M-Pesa "boost" payment completes; listing sorts to top until this time
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  inquiries Inquiry[]
  payments  Payment[]

  @@index([status])
  @@index([county])
  @@index([cropName])
}

// M-Pesa STK Push payments. Currently used for the "boost listing" feature —
// a farmer pays a small fee (KES) to pin their listing to the top of search
// results for a period. Designed so the same model/flow extends naturally to
// future paid features (subscriptions, buyer connection fees, escrow, etc.).
model Payment {
  id                  String    @id @default(uuid())
  user                User      @relation(fields: [userId], references: [id])
  userId              String
  listing             Listing?  @relation(fields: [listingId], references: [id])
  listingId           String?
  purpose             String    // "LISTING_BOOST" | future: "SUBSCRIPTION" | "CONNECTION_FEE"
  amountKes           Float
  phone               String
  status              String    @default("PENDING") // PENDING | COMPLETED | FAILED | CANCELLED
  mpesaCheckoutRequestId String? @unique
  mpesaMerchantRequestId String?
  mpesaReceiptNumber  String?
  resultDescription   String?
  createdAt           DateTime  @default(now())
  updatedAt            DateTime @updatedAt

  @@index([userId])
  @@index([status])
}

model Inquiry {
  id        String   @id @default(uuid())
  listing   Listing  @relation(fields: [listingId], references: [id])
  listingId String
  buyer     User     @relation("BuyerInquiries", fields: [buyerId], references: [id])
  buyerId   String
  message   String?
  createdAt DateTime @default(now())

  @@index([listingId])
  @@index([buyerId])
}

model HistoryLog {
  id        String   @id @default(uuid())
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  action    String   // "SOIL_CHECK" | "DISEASE_CHECK" | "LISTING_CREATED" | "INQUIRY_SENT" | "LOGIN"
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
}
