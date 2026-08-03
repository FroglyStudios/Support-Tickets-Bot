const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim a ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: 'This channel is not a ticket.', flags: MessageFlags.Ephemeral });
    }

    if (ticket.claimed_by_id) {
      return interaction.reply({ content: `Ticket already claimed by <@${ticket.claimed_by_id}>.`, flags: MessageFlags.Ephemeral });
    }

    db.prepare('UPDATE tickets SET claimed_by_id = ? WHERE channel_id = ?').run(interaction.user.id, interaction.channelId);

    await interaction.reply({ content: `Ticket claimed by <@${interaction.user.id}>.` });
  },
};
