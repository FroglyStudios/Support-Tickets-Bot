const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Get a link to the official support Discord server'),
  async execute(interaction) {
    await interaction.reply({ 
      content: 'Join our official Support Discord here: https://discord.gg/9ytk4w8Ffm',
      ephemeral: true 
    });
  }
};
