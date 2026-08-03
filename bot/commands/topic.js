const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('topic')
    .setDescription('Set the topic for this ticket')
    .addStringOption(option => 
      option.setName('topic')
        .setDescription('The new topic')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: 'This channel is not a ticket.', flags: MessageFlags.Ephemeral });
    }

    const newTopic = interaction.options.getString('topic');

    try {
      db.prepare('UPDATE tickets SET topic = ? WHERE channel_id = ?').run(newTopic, interaction.channelId);
      await interaction.channel.setTopic(newTopic);
      await interaction.reply({ content: `Ticket topic updated to: **${newTopic}**` });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Failed to update topic. Check bot permissions or rate limits.', flags: MessageFlags.Ephemeral });
    }
  },
};
