const { SlashCommandBuilder } = require('discord.js');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { getConnection } = require('../db');

const BCRYPT_ROUNDS = 12;
const MAX_PASS_LEN = 72; // bcrypt's hard input limit

// Validation — match real DB constraints
const USERNAME_RE  = /^[a-zA-Z0-9_]{3,12}$/;
const NICKNAME_RE  = /^[a-zA-Z0-9_ ]{2,12}$/;
const MIN_PASS_LEN = 6;
const FORBIDDEN_NAMES = ['admin', 'administrator', 'mod', 'moderator', 'gm', 'gamemaster', 'system', 'root'];

// ── Rate limiting (in-memory, per Discord user) ──────────────────────
const REGISTER_COOLDOWN_MS = 60_000; // 60 seconds
const registerCooldowns = new Map();

function isRateLimited(userId) {
  // Cleanup old entries to prevent memory leaks
  for (const [id, time] of registerCooldowns.entries()) {
    if (Date.now() - time >= REGISTER_COOLDOWN_MS) {
      registerCooldowns.delete(id);
    }
  }

  const last = registerCooldowns.get(userId);
  if (!last) return false;
  return (Date.now() - last) < REGISTER_COOLDOWN_MS;
}

function getRemainingCooldown(userId) {
  const last = registerCooldowns.get(userId);
  if (!last) return 0;
  return Math.ceil((REGISTER_COOLDOWN_MS - (Date.now() - last)) / 1000);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Create a MicroVolts account on this server.')
    .addStringOption(opt =>
      opt.setName('username')
         .setDescription('Your login username (3-12 chars, letters/numbers/underscore)')
         .setRequired(true))
    .addStringOption(opt =>
      opt.setName('password')
         .setDescription('Your password (6-72 characters)')
         .setRequired(true))
    .addStringOption(opt =>
      opt.setName('nickname')
         .setDescription('Your in-game display name (2-12 chars)')
         .setRequired(true)),

  async execute(interaction) {
    // Always reply ephemerally so credentials stay private
    await interaction.deferReply({ ephemeral: true });

    const discordId = interaction.user.id;

    // ── Rate limit check ──────────────────────────────────────────
    if (isRateLimited(discordId)) {
      const secs = getRemainingCooldown(discordId);
      console.warn(`[SECURITY_ALERT] Rate-limit (DoS prevention) triggered by discord="${interaction.user.tag}". Cooldown: ${secs}s`);
      return interaction.editReply(
        `⏳ **Slow down.** Try again in ${secs} second${secs !== 1 ? 's' : ''}.`
      );
    }

    const username = interaction.options.getString('username').trim();
    const password = interaction.options.getString('password');
    const nickname = interaction.options.getString('nickname').trim();

    // ── Validation ────────────────────────────────────────────────
    if (!USERNAME_RE.test(username)) {
      return interaction.editReply(
        '❌ **Invalid username.** Use 3-12 characters: letters, numbers, or underscores only.'
      );
    }

    if (FORBIDDEN_NAMES.some(name => username.toLowerCase().includes(name))) {
      return interaction.editReply('❌ **Invalid username.** This name contains restricted words.');
    }

    if (password.length < MIN_PASS_LEN) {
      return interaction.editReply(
        `❌ **Password too short.** Minimum ${MIN_PASS_LEN} characters.`
      );
    }

    if (password.length > MAX_PASS_LEN) {
      return interaction.editReply(
        `❌ **Password too long.** Maximum ${MAX_PASS_LEN} characters.`
      );
    }

    if (!NICKNAME_RE.test(nickname)) {
      return interaction.editReply(
        '❌ **Invalid nickname.** Use 2-12 characters (letters, numbers, spaces, underscores).'
      );
    }

    if (FORBIDDEN_NAMES.some(name => nickname.toLowerCase().includes(name))) {
      return interaction.editReply('❌ **Invalid nickname.** This name contains restricted words.');
    }

    // ── Hash password (bcrypt, 12 rounds) ─────────────────────────
    // Put rate limit HERE before bcrypt to prevent CPU exhaustion DoS!
    registerCooldowns.set(discordId, Date.now());

    // Produces a $2b$ hash compatible with ToyBattlesHQ's AuthServer
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Generate a recovery passphrase
    const rawPassphrase = crypto.randomBytes(8).toString('hex');
    const hashedPassphrase = await bcrypt.hash(rawPassphrase, BCRYPT_ROUNDS);

    // ── Insert into DB (transactional: users + discord_links) ─────
    let conn;
    try {
      conn = await getConnection();
      await conn.beginTransaction();

      // Check account limit (max 2)
      const existing = await conn.query(
        `SELECT COUNT(*) as count FROM discord_links WHERE DiscordID = ? FOR UPDATE`,
        [discordId]
      );
      if (Number(existing[0].count) >= 2) {
        await conn.rollback();
        return interaction.editReply('❌ **You have reached the maximum limit of 2 accounts per Discord user.**');
      }

      const result = await conn.query(
        `INSERT INTO users (Username, Password, Nickname) VALUES (?, ?, ?)`,
        [username, hashedPassword, nickname]
      );

      await conn.query(
        `INSERT INTO discord_links (AccountID, DiscordID, Passphrase) VALUES (?, ?, ?)`,
        [result.insertId, discordId, hashedPassphrase]
      );

      await conn.commit();

      console.log(`[REGISTER] New account: Username="${username}", discord="${interaction.user.tag}"`);

      return interaction.editReply(
        `✅ **Account created successfully!**\n` +
        `> 🎮 Username: \`${username}\`\n` +
        `> 🏷️ Nickname: \`${nickname}\`\n\n` +
        `You can now log in to the MicroVolts private server. Have fun!\n\n` +
        `⚠️ **IMPORTANT: Save your Recovery Passphrase!** ⚠️\n` +
        `> 🔑 Passphrase: \`${rawPassphrase}\`\n` +
        `Please save this passphrase to a **password manager**. It is required if you ever need to recover your account. This is the **ONLY** time it will be shown to you!`
      );

    } catch (err) {
      if (conn) await conn.rollback();

      // MariaDB duplicate-entry error code
      if (err.code === 'ER_DUP_ENTRY') {
        if (err.message.includes('Username') || err.message.includes('uniqueUsername')) {
          return interaction.editReply('❌ **Username already taken.** Please choose a different one.');
        }
        if (err.message.includes('Nickname') || err.message.includes('uniqueNickname')) {
          return interaction.editReply('❌ **Nickname already taken.** Please choose a different one.');
        }
      }
      console.error('[REGISTER] DB error:', err);
      return interaction.editReply('❌ A database error occurred. Please try again later.');
    } finally {
      if (conn) conn.release();
    }
  },
};
