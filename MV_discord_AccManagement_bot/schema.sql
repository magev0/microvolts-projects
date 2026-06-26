-- MicroVolts Discord Bot – supplementary schema
-- The `users` table is managed by ToyBattlesHQ. Do NOT create/modify it here.
-- Run this once to create the bot's linking table.

-- Maps Discord user IDs to game AccountIDs.
-- The FK ensures orphaned links are cleaned up when accounts are deleted.
CREATE TABLE IF NOT EXISTS discord_links (
  AccountID   INT(11)      NOT NULL,
  DiscordID   VARCHAR(20)  NOT NULL COMMENT 'Discord snowflake ID',
  LinkedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Passphrase  VARCHAR(255) DEFAULT NULL COMMENT 'Hashed recovery passphrase',
  LastPasswordChange DATETIME DEFAULT NULL,
  ChangePwFailures INT NOT NULL DEFAULT 0,
  ChangePwLockoutUntil DATETIME DEFAULT NULL,
  PRIMARY KEY (AccountID),
  INDEX idx_discord (DiscordID),
  CONSTRAINT fk_discord_account FOREIGN KEY (AccountID)
    REFERENCES users (AccountID)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
