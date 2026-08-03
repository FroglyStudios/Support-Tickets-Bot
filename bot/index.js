const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionsBitField, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { getTranslation } = require('../translations');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const slashCommandsData = [];

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    slashCommandsData.push(command.data.toJSON());
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

client.once('ready', async () => {
  console.log(`Bot logged in as ${client.user.tag}`);

  // Register commands dynamically
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: slashCommandsData },
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
      }
    }
    return;
  }

  // Handle Select Menu (Category selection)
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category_select') {
    const categoryId = interaction.values[0];
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
    
    if (!category) {
      return interaction.reply({ content: 'Category not found.', flags: MessageFlags.Ephemeral });
    }

    const questions = db.prepare('SELECT * FROM questions WHERE category_id = ?').all(categoryId);

    if (questions.length > 0) {
      const modal = new ModalBuilder()
        .setCustomId(`ticket_modal_${categoryId}`)
        .setTitle(category.name.substring(0, 45)); // Max 45 chars for modal title

      // Discord allows max 5 action rows in a modal
      const limitedQuestions = questions.slice(0, 5);

      limitedQuestions.forEach(q => {
        const input = new TextInputBuilder()
          .setCustomId(`question_${q.id}`)
          .setLabel(q.label.substring(0, 45))
          .setStyle(q.style === 1 ? TextInputStyle.Short : TextInputStyle.Paragraph)
          .setRequired(q.required === 1);

        if (q.placeholder) input.setPlaceholder(q.placeholder.substring(0, 100));
        if (q.min_length) input.setMinLength(q.min_length);
        if (q.max_length) input.setMaxLength(q.max_length);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
      });

      await interaction.showModal(modal);
    } else {
      await createTicket(interaction, categoryId, []);
    }
  }

  // Handle Action Buttons (Category selection)
  if (interaction.isButton() && interaction.customId.startsWith('ticket_btn_')) {
    const categoryId = interaction.customId.replace('ticket_btn_', '');
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
    
    if (!category) {
      return interaction.reply({ content: 'Category not found.', flags: MessageFlags.Ephemeral });
    }

    const questions = db.prepare('SELECT * FROM questions WHERE category_id = ?').all(categoryId);

    if (questions.length > 0) {
      const modal = new ModalBuilder()
        .setCustomId(`ticket_modal_${categoryId}`)
        .setTitle(category.name.substring(0, 45));

      const limitedQuestions = questions.slice(0, 5);

      limitedQuestions.forEach(q => {
        const input = new TextInputBuilder()
          .setCustomId(`question_${q.id}`)
          .setLabel(q.label.substring(0, 45))
          .setStyle(q.style === 1 ? TextInputStyle.Short : TextInputStyle.Paragraph)
          .setRequired(q.required === 1);

        if (q.placeholder) input.setPlaceholder(q.placeholder.substring(0, 100));
        if (q.min_length) input.setMinLength(q.min_length);
        if (q.max_length) input.setMaxLength(q.max_length);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
      });

      await interaction.showModal(modal);
    } else {
      await createTicket(interaction, categoryId, []);
    }
  }

  // Handle Modal Submit
  if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_')) {
    const categoryId = interaction.customId.replace('ticket_modal_', '');
    
    const answers = [];
    interaction.components.forEach(row => {
      const input = row.components[0];
      const questionId = input.customId.replace('question_', '');
      const question = db.prepare('SELECT label FROM questions WHERE id = ?').get(questionId);
      answers.push({
        label: question ? question.label : 'Question',
        value: input.value
      });
    });

    await createTicket(interaction, categoryId, answers);
  }

  // Handle Ticket Close
  if (interaction.isButton() && interaction.customId === 'ticket_close') {
    const ticketId = interaction.channel.name.split('-')[1]; // Simple assumption
    
    const reply = getTranslation(interaction.guildId, 'TICKET_CLOSED', { user: interaction.user.tag });
    await interaction.reply({ content: reply });
    
    db.prepare('UPDATE tickets SET status = ?, closed_by_id = ?, closed_at = CURRENT_TIMESTAMP WHERE channel_id = ?').run('closed', interaction.user.id, interaction.channel.id);
    
    setTimeout(() => {
      interaction.channel.delete().catch(console.error);
    }, 5000);
  }

  // Handle Feedback Button
  if (interaction.isButton() && interaction.customId.startsWith('feedback_')) {
    const ticketId = interaction.customId.split('_')[1];
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
    
    const modal = new ModalBuilder()
      .setCustomId(`feedback_modal_${ticketId}`)
      .setTitle('Leave Feedback');

    const starsInput = new TextInputBuilder()
      .setCustomId('stars')
      .setLabel('Rating (0-5 Stars)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(1)
      .setPlaceholder('5');

    const commentInput = new TextInputBuilder()
      .setCustomId('comment')
      .setLabel('Comment (Optional)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const anonInput = new TextInputBuilder()
      .setCustomId('anonymous')
      .setLabel('Anonymous? (yes/no)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('yes');

    modal.addComponents(
      new ActionRowBuilder().addComponents(starsInput),
      new ActionRowBuilder().addComponents(commentInput),
      new ActionRowBuilder().addComponents(anonInput)
    );

    await interaction.showModal(modal);
  }

  // Handle Feedback Modal Submit
  if (interaction.isModalSubmit() && interaction.customId.startsWith('feedback_modal_')) {
    const ticketId = interaction.customId.split('_')[2];
    let stars = parseInt(interaction.fields.getTextInputValue('stars'));
    if (isNaN(stars) || stars < 0 || stars > 5) stars = 5;
    
    const comment = interaction.fields.getTextInputValue('comment') || '';
    const anonVal = (interaction.fields.getTextInputValue('anonymous') || 'yes').toLowerCase();
    const isAnon = anonVal !== 'no';
    
    const userId = isAnon ? null : interaction.user.id;
    
    // We need guildId, which we can get from interaction.guild.id
    const guildId = interaction.guild.id;
    
    // Ensure ticket exists in DB
    const ticket = db.prepare('SELECT ticket_id FROM tickets WHERE channel_id = ?').get(interaction.channel.id);
    if (ticket) {
      db.prepare('INSERT INTO feedback (guild_id, ticket_id, user_id, stars, comment) VALUES (?, ?, ?, ?, ?)')
        .run(guildId, ticket.ticket_id, userId, stars, comment);
      
      db.prepare('UPDATE tickets SET status = ?, closed_by_id = ?, closed_reason = ?, closed_at = CURRENT_TIMESTAMP WHERE channel_id = ?')
        .run('closed', interaction.user.id, 'Closed with Feedback', interaction.channel.id);
    }

    await interaction.reply({ content: 'Thank you for your feedback! The ticket will be closed and deleted in 5 seconds.' });
    
    setTimeout(() => {
      interaction.channel.delete().catch(console.error);
    }, 5000);
  }
});

client.on('messageCreate', async message => {
  if (!message.guild) return;
  
  // Check if channel is a ticket
  const ticket = db.prepare('SELECT ticket_id FROM tickets WHERE channel_id = ?').get(message.channel.id);
  if (!ticket) return;

  db.prepare(`
    INSERT INTO archived_messages (id, ticket_id, author_id, author_username, author_avatar, content, created_at, is_bot)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
  `).run(
    message.id, 
    ticket.ticket_id, 
    message.author.id, 
    message.author.tag, 
    message.author.displayAvatarURL(), 
    message.content || '[Attachment/Embed]', 
    message.author.bot ? 1 : 0
  );
});

async function createTicket(interaction, categoryId, answers) {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
  if (!category) return;

  const ticketId = Math.random().toString(36).substring(2, 8).toLowerCase();
  const channelName = `ticket-${ticketId}`;

  try {
    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: interaction.client.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        }
      ],
    });

    // Save to database
    db.prepare(`
      INSERT INTO tickets (ticket_id, guild_id, user_id, channel_id, category_id, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(ticketId, interaction.guild.id, interaction.user.id, channel.id, categoryId);

    const guildSettings = db.prepare('SELECT enable_feedback FROM guilds WHERE guild_id = ?').get(interaction.guild.id);
    
    let ticketMsg = category.ticket_message || 'Please wait for a staff member to assist you.';
    ticketMsg = ticketMsg.replace('{user}', `<@${interaction.user.id}>`);

    const embed = new EmbedBuilder()
      .setTitle(`Welcome to your ticket`)
      .setDescription(ticketMsg)
      .setColor('#5865F2');

    const components = [];
    if (guildSettings && guildSettings.enable_feedback === 1) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`feedback_${ticketId}`)
          .setLabel('Close & Feedback')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('ticket_close')
          .setLabel('Close Ticket')
          .setEmoji('✖️')
          .setStyle(ButtonStyle.Secondary)
      );
      components.push(row);
    } else {
      const closeBtn = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger);
      components.push(new ActionRowBuilder().addComponents(closeBtn));
    }

    if (answers && answers.length > 0) {
      answers.forEach(a => {
        embed.addFields({ name: a.label, value: a.value || 'No answer provided' });
      });
    }

    await channel.send({ 
      content: `<@${interaction.user.id}>`, 
      embeds: [embed], 
      components 
    });
    
    // Instead of replying (which might fail if taking too long), we should deferReply first or just reply ephemerally
    if (interaction.deferred || interaction.replied) {
       await interaction.followUp({ content: `Ticket created: <#${channel.id}>`, flags: MessageFlags.Ephemeral });
    } else {
       await interaction.reply({ content: `Ticket created: <#${channel.id}>`, flags: MessageFlags.Ephemeral });
    }

  } catch (error) {
    console.error(error);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: 'Failed to create ticket channel.', flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: 'Failed to create ticket channel.', flags: MessageFlags.Ephemeral });
    }
  }
}

module.exports = client;
