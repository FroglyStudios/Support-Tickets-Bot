const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('priority')
    .setDescription('Set the priority of the current ticket')
    .addStringOption(option => 
      option.setName('level')
        .setDescription('Priority level')
        .setRequired(true)
        .addChoices(
          { name: 'High', value: 'high' },
          { name: 'Medium', value: 'medium' },
          { name: 'Low', value: 'low' }
        )
    ),
  async execute(interaction) {
    // Check if channel is a ticket
    const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({ content: 'This command can only be used in a ticket channel.', flags: MessageFlags.Ephemeral });
    }

    // Check moderator permissions
    const guildSettings = db.prepare('SELECT moderator_roles FROM guilds WHERE guild_id = ?').get(interaction.guild.id);
    let isMod = false;
    
    // Check if user has admin permissions globally just in case
    if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      isMod = true;
    }

    if (guildSettings && guildSettings.moderator_roles) {
      try {
        const modRoles = JSON.parse(guildSettings.moderator_roles);
        if (interaction.member.roles.cache.some(role => modRoles.includes(role.id))) {
          isMod = true;
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }

    if (!isMod) {
      return interaction.reply({ content: 'You do not have permission to change the ticket priority.', flags: MessageFlags.Ephemeral });
    }

    const level = interaction.options.getString('level');
    
    let emoji = '';
    if (level === 'high') emoji = '🔴';
    if (level === 'medium') emoji = '🟠';
    if (level === 'low') emoji = '🟢';

    // Update channel name
    let currentName = interaction.channel.name;
    
    // Remove existing priority emojis if any
    currentName = currentName.replace(/^🔴-?|^🟠-?|^🟢-?/, '');

    const newName = `${emoji}-${currentName}`;

    try {
      await interaction.channel.setName(newName);
      
      // Update database
      db.prepare('UPDATE tickets SET priority = ? WHERE channel_id = ?').run(level, interaction.channel.id);
      
      await interaction.reply({ content: `Ticket priority has been set to **${level}** ${emoji}` });
    } catch (error) {
      console.error('Failed to set channel name:', error);
      await interaction.reply({ content: 'Failed to update channel name. Discord might be rate-limiting channel renames (max 2 per 10 minutes per channel). The database has been updated.', flags: MessageFlags.Ephemeral });
      db.prepare('UPDATE tickets SET priority = ? WHERE channel_id = ?').run(level, interaction.channel.id);
    }
  }
};
