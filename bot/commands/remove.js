const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a user from the ticket')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to remove')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: 'This channel is not a ticket.', flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('user');

    await interaction.channel.permissionOverwrites.delete(user.id);

    await interaction.reply({ content: `Removed <@${user.id}> from the ticket.` });
  },
};
