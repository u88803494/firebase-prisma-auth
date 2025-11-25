-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uid" TEXT NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT,
    "password" TEXT,
    "displayName" TEXT,
    "photoURL" TEXT,
    "birthDate" DATETIME,
    "gender" TEXT,
    "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "googleId" TEXT,
    "facebookId" TEXT,
    "lineId" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("birthDate", "createdAt", "displayName", "email", "emailVerified", "facebookId", "gender", "googleId", "id", "lastLoginAt", "lineId", "password", "phoneNumber", "phoneVerified", "photoURL", "profileCompleted", "uid", "updatedAt") SELECT "birthDate", "createdAt", "displayName", "email", "emailVerified", "facebookId", "gender", "googleId", "id", "lastLoginAt", "lineId", "password", "phoneNumber", "phoneVerified", "photoURL", "profileCompleted", "uid", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_uid_key" ON "users"("uid");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
CREATE UNIQUE INDEX "users_facebookId_key" ON "users"("facebookId");
CREATE UNIQUE INDEX "users_lineId_key" ON "users"("lineId");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_phoneNumber_idx" ON "users"("phoneNumber");
CREATE INDEX "users_uid_idx" ON "users"("uid");
CREATE INDEX "users_googleId_idx" ON "users"("googleId");
CREATE INDEX "users_facebookId_idx" ON "users"("facebookId");
CREATE INDEX "users_lineId_idx" ON "users"("lineId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
