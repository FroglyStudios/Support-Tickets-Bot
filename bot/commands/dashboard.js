const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTranslation } = require('../../translations');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Get the link to the dashboard'),
  async execute(interaction) {
    const reply = getTranslation(interaction.guildId, 'DASHBOARD_INFO_REPLY', { url: 'https://tickets.frogly.fun' });
    await interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
  },
};
