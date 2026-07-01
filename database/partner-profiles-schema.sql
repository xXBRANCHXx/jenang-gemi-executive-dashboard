CREATE TABLE IF NOT EXISTS `partner_profiles` (
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `partner_slug` VARCHAR(160) NOT NULL,
  `notes` VARCHAR(300) NOT NULL DEFAULT '',
  `selected_skus_json` LONGTEXT NULL DEFAULT NULL,
  `pricing_json` LONGTEXT NULL DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL DEFAULT '',
  `password_updated_at` DATETIME NULL DEFAULT NULL,
  `password_reset_key_hash` VARCHAR(255) NOT NULL DEFAULT '',
  `password_reset_key_created_at` DATETIME NULL DEFAULT NULL,
  `password_reset_token_hash` VARCHAR(255) NOT NULL DEFAULT '',
  `password_reset_token_expires_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`code`),
  UNIQUE KEY `uniq_partner_profiles_slug` (`partner_slug`),
  KEY `idx_partner_profiles_updated` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
