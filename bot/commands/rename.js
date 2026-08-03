const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename the ticket channel')
    .addStringOption(option => 
      option.setName('name')
        .setDescription('The new name for the ticket')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: 'This channel is not a ticket.', flags: MessageFlags.Ephemeral });
    }

    const newName = interaction.options.getString('name');

    try {
      await interaction.channel.setName(newName);
      await interaction.reply({ content: `Ticket renamed to \`${newName}\`.` });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Failed to rename channel. Check bot permissions or rate limits.', flags: MessageFlags.Ephemeral });
    }
  },
};
