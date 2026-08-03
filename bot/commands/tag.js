const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Send a predefined tag in this ticket')
    .addStringOption(option => 
      option.setName('name')
        .setDescription('The name of the tag')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const tagName = interaction.options.getString('name');
    
    const tag = db.prepare('SELECT * FROM tags WHERE guild_id = ? AND name = ?').get(interaction.guildId, tagName);
    
    if (!tag) {
      return interaction.reply({ content: `Tag \`${tagName}\` not found.`, flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({ content: tag.content });
  },
};
