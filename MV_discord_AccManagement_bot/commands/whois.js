const { SlashCommandBuilder } = require('discord.js');
const { query } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whois')
    .setDescription('Look up the MicroVolts account linked to a Discord user.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The Discord user to look up (defaults to yourself)')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('user') ?? interaction.user;

    try {
      const rows = await query(
        `SELECT u.Username, u.Nickname, u.Level, u.Grade, dl.LinkedAt
         FROM discord_links dl
         JOIN users u ON u.AccountID = dl.AccountID
         WHERE dl.DiscordID = ?`,
        [target.id]
      );

      if (!rows.length) {
        return interaction.editReply(
          `❌ **${target.username}** has no registered MicroVolts account.`
        );
      }

      let reply = `🔍 **Account info for ${target.username}**\n`;
      rows.forEach((row, i) => {
        const { Nickname, Level, Grade, LinkedAt } = row;
        const date = new Date(LinkedAt).toUTCString();
        reply += `\n**Account ${i + 1}**\n` +
                 `> 🏷️ Nickname: \`${Nickname}\`\n` +
                 `> 🎖️ Level: \`${Level}\` · Grade: \`${Grade}\`\n` +
                 `> 📅 Registered: \`${date}\`\n`;
      });

      return interaction.editReply(reply);
    } catch (err) {
      console.error('[WHOIS] DB error:', err);
      return interaction.editReply('❌ A database error occurred. Please try again later.');
    }
  },
};
