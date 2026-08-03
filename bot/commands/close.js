const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close a ticket')
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for closing')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: 'This channel is not a ticket.', flags: MessageFlags.Ephemeral });
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Mark as closed in DB
    db.prepare('UPDATE tickets SET status = ?, closed_by_id = ?, closed_reason = ?, closed_at = CURRENT_TIMESTAMP WHERE channel_id = ?')
      .run('closed', interaction.user.id, reason, interaction.channelId);

    await interaction.reply({ content: `Ticket closed by <@${interaction.user.id}>. Reason: ${reason}` });
    
    // Attempt to archive and delete
    setTimeout(async () => {
      try {
        await interaction.channel.delete();
      } catch (e) {
        console.error('Failed to delete closed ticket channel:', e);
      }
    }, 5000); // 5 second delay before deleting
  },
};
