/**
 * deploy-commands.js
 * Run once (or after any command change) to register slash commands with Discord.
 *
 *   node deploy-commands.js          → register to a single guild (fast, instant)
 *   node deploy-commands.js --global → register globally (up to 1 hour to propagate)
 */

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(commandsPath, file));
  if (cmd.data) commands.push(cmd.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const isGlobal = process.argv.includes('--global');

    if (isGlobal) {
      console.log(`Deploying ${commands.length} command(s) globally…`);
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log('✅ Global commands registered (may take up to 1 hour to appear).');
    } else {
      if (!process.env.GUILD_ID) {
        console.error('❌ GUILD_ID is not set in .env — required for guild deployment.');
        process.exit(1);
      }
      console.log(`Deploying ${commands.length} command(s) to guild ${process.env.GUILD_ID}…`);
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log('✅ Guild commands registered (should appear instantly).');
    }
  } catch (err) {
    console.error('❌ Deploy failed:', err);
  }
})();
