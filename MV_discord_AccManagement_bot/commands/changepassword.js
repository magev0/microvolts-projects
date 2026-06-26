const { SlashCommandBuilder } = require('discord.js');
const bcrypt = require('bcrypt');
const { getConnection } = require('../db');

const BCRYPT_ROUNDS = 12;
const MIN_PASS_LEN = 6;
const MAX_PASS_LEN = 72; // bcrypt's hard input limit

module.exports = {
  data: new SlashCommandBuilder()
    .setName('changepassword')
    .setDescription('Change your MicroVolts account password.')
    .addStringOption(opt =>
      opt.setName('username')
        .setDescription('The username of the account to change')
        .setRequired(true)
        .setAutocomplete(true))
    .addStringOption(opt =>
      opt.setName('old_password')
        .setDescription('Your current password')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('new_password')
        .setDescription('Your new password (6-72 characters)')
        .setRequired(true)),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    let conn;
    try {
      conn = await getConnection();
      const rows = await conn.query(
        `SELECT u.Username 
         FROM discord_links dl 
         JOIN users u ON u.AccountID = dl.AccountID 
         WHERE dl.DiscordID = ?`,
        [interaction.user.id]
      );

      const choices = rows.map(r => r.Username);
      const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue.toLowerCase()));
      await interaction.respond(
        filtered.map(choice => ({ name: choice, value: choice }))
      );
    } catch (err) {
      console.error('[AUTOCOMPLETE] DB error:', err);
      await interaction.respond([]);
    } finally {
      if (conn) conn.release();
    }
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const username = interaction.options.getString('username').trim();
    const oldPass = interaction.options.getString('old_password');
    const newPass = interaction.options.getString('new_password');
    const discordId = interaction.user.id;

    // ── Validation ────────────────────────────────────────────────
    if (newPass.length < MIN_PASS_LEN) {
      return interaction.editReply('❌ **New password too short.** Minimum 6 characters.');
    }

    if (newPass.length > MAX_PASS_LEN) {
      return interaction.editReply('❌ **New password too long.** Maximum 72 characters.');
    }

    // ── Transactional password change ─────────────────────────────
    let conn;
    try {
      conn = await getConnection();
      await conn.beginTransaction();

      // Fetch current hash with row lock to prevent races
      const rows = await conn.query(
        `SELECT u.AccountID, u.Password, dl.LastPasswordChange, dl.ChangePwFailures, dl.ChangePwLockoutUntil
         FROM discord_links dl
         JOIN users u ON u.AccountID = dl.AccountID
         WHERE dl.DiscordID = ? AND u.Username = ?
         FOR UPDATE`,
        [discordId, username]
      );

      if (!rows.length) {
        await conn.rollback();
        return interaction.editReply('❌ You do not have a registered account with that username.');
      }

      const { AccountID, Password: currentHash, LastPasswordChange, ChangePwFailures, ChangePwLockoutUntil } = rows[0];

      if (ChangePwLockoutUntil) {
        const lockoutMs = new Date(ChangePwLockoutUntil).getTime();
        if (Date.now() < lockoutMs) {
          await conn.rollback();
          const remainingMins = Math.ceil((lockoutMs - Date.now()) / 60000);
          return interaction.editReply(`🚫 **You are temporarily locked out from changing your password.** Try again in ${remainingMins} minute(s).`);
        }
      }

      if (LastPasswordChange) {
        const lastChangeMs = new Date(LastPasswordChange).getTime();
        const fifteenMins = 15 * 60 * 1000;
        if (Date.now() - lastChangeMs < fifteenMins) {
          await conn.rollback();
          const remaining = Math.ceil((fifteenMins - (Date.now() - lastChangeMs)) / 60000);
          return interaction.editReply(`⏳ **You can only change your password once every 15 minutes.** Please try again in ${remaining} minute(s).`);
        }
      }

      // Verify old password against bcrypt hash
      const match = await bcrypt.compare(oldPass, currentHash);
      if (!match) {
        let newFailures = ChangePwFailures + 1;
        let updateQuery = `UPDATE discord_links SET ChangePwFailures = ? WHERE AccountID = ?`;
        let params = [newFailures, AccountID];
        
        let msg = '❌ **Incorrect current password.**';

        if (newFailures >= 5) {
          // Exponential backoff: base 15 minutes * 2^(failures - 5)
          const multiplier = Math.pow(2, newFailures - 5);
          const lockoutMinutes = 15 * multiplier;
          const lockoutTime = new Date(Date.now() + lockoutMinutes * 60 * 1000);
          
          updateQuery = `UPDATE discord_links SET ChangePwFailures = ?, ChangePwLockoutUntil = ? WHERE AccountID = ?`;
          params = [newFailures, lockoutTime, AccountID];
          msg = `🚫 **Too many incorrect attempts.** You have been locked out for ${lockoutMinutes} minutes.`;
          
          console.warn(`[SECURITY_ALERT] Brute-force lockout triggered for account "${username}" by discord="${interaction.user.tag}". Duration: ${lockoutMinutes}m (Failures: ${newFailures})`);
        }

        await conn.query(updateQuery, params);
        await conn.commit();
        return interaction.editReply(msg);
      }

      // Hash and persist the new password
      const newHash = await bcrypt.hash(newPass, BCRYPT_ROUNDS);
      await conn.query(
        `UPDATE users SET Password = ? WHERE AccountID = ?`,
        [newHash, AccountID]
      );

      const now = new Date();
      await conn.query(
        `UPDATE discord_links SET ChangePwFailures = 0, ChangePwLockoutUntil = NULL, LastPasswordChange = ? WHERE AccountID = ?`,
        [now, AccountID]
      );

      await conn.commit();

      console.log(`[CHANGEPASSWORD] Password changed for account "${username}" by discord = "${interaction.user.tag}"`);
      return interaction.editReply(`✅ ** Password updated successfully for account \`${username}\`!**`);

      } catch (err) {
        if (conn) await conn.rollback();
        console.error('[CHANGEPASSWORD] DB error:', err);
        return interaction.editReply('❌ A database error occurred. Please try again later.');
      } finally {
        if (conn) conn.release();
      }
    },
  };
