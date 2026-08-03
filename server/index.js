require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db');
const bot = require('../bot');
const { getTranslation } = require('../translations');

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// --- Middleware to check Admin perms on a guild ---
const adminCache = new Map(); // token -> { guilds: [], expires: ... }
const pendingAdminRequests = new Map(); // token -> Promise

const checkAdmin = async (req, res, next) => {
  if (!req.session.userId || !req.session.accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const guildId = req.params.guildId;
  const token = req.session.accessToken;
  if (!guildId) return next();

  // 1. Check local session cache
  if (req.session.adminGuilds && req.session.adminGuilds.includes(guildId)) {
    return next();
  }

  // 2. Check global memory cache (valid for 5 mins)
  if (adminCache.has(token)) {
    const cache = adminCache.get(token);
    if (cache.expires > Date.now()) {
      req.session.adminGuilds = cache.guilds;
      if (cache.guilds.includes(guildId)) return next();
      return res.status(403).json({ error: 'Missing admin permission' });
    }
  }

  // 3. Deduplicate requests (if multiple parallel requests happen, wait for the first one)
  try {
    let guilds;
    if (pendingAdminRequests.has(token)) {
      guilds = await pendingAdminRequests.get(token);
    } else {
      const fetchPromise = fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(async response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch guilds (Status: ${response.status})`);
        }
        return response.json();
      });
      
      pendingAdminRequests.set(token, fetchPromise);
      guilds = await fetchPromise;
      pendingAdminRequests.delete(token);
    }

    const ADMIN = BigInt(0x8);
    
    // Cache admin guilds
    const adminGuildIds = guilds
      .filter(g => (BigInt(g.permissions) & ADMIN) === ADMIN)
      .map(g => g.id);
      
    adminCache.set(token, { guilds: adminGuildIds, expires: Date.now() + 5 * 60 * 1000 });
    req.session.adminGuilds = adminGuildIds;
    
    if (!adminGuildIds.includes(guildId)) {
      return res.status(403).json({ error: 'Missing admin permission' });
    }

    next();
  } catch (error) {
    pendingAdminRequests.delete(token);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

// --- Auth Routes ---
app.get('/api/auth/login', (req, res) => {
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI);
  const clientId = process.env.DISCORD_CLIENT_ID;
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds`;
  res.json({ url });
});

app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      })
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) return res.status(400).json(tokenData);

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userResponse.json();

    req.session.accessToken = tokenData.access_token;
    req.session.userId = userData.id;
    req.session.username = userData.username;

    res.redirect('/');
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', (req, res) => {
  if (req.session.userId) {
    res.json({ id: req.session.userId, username: req.session.username });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// --- User Guilds ---
app.get('/api/user/guilds', async (req, res) => {
  if (!req.session.accessToken) return res.status(401).json({ error: 'Unauthorized' });

  // Use session cache if less than 60 seconds old
  if (req.session.guildsCache && req.session.guildsCacheTime && (Date.now() - req.session.guildsCacheTime < 60000)) {
    return res.json(req.session.guildsCache);
  }

  try {
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${req.session.accessToken}` }
    });
    const guilds = await response.json();
    const ADMIN = BigInt(0x8);
    const adminGuilds = guilds.filter(g => (BigInt(g.permissions) & ADMIN) === ADMIN);

    // Check if bot is in the guild
    const botGuilds = bot.guilds.cache.map(g => g.id);
    const enhancedGuilds = adminGuilds.map(g => ({
      ...g,
      botInGuild: botGuilds.includes(g.id)
    }));

    req.session.guildsCache = enhancedGuilds;
    req.session.guildsCacheTime = Date.now();

    res.json(enhancedGuilds);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Guild Settings ---
app.get('/api/guild/:guildId/settings', checkAdmin, (req, res) => {
  let guild = db.prepare('SELECT *, enable_feedback FROM guilds WHERE guild_id = ?').get(req.params.guildId);
  if (!guild) {
    db.prepare('INSERT INTO guilds (guild_id) VALUES (?)').run(req.params.guildId);
    guild = db.prepare('SELECT *, enable_feedback FROM guilds WHERE guild_id = ?').get(req.params.guildId);
  }

  const categories = db.prepare('SELECT * FROM categories WHERE guild_id = ?').all(req.params.guildId);
  const messages = db.prepare('SELECT * FROM messages WHERE guild_id = ?').all(req.params.guildId);

  res.json({ guild, categories, messages });
});

app.post('/api/guild/:guildId/settings', checkAdmin, (req, res) => {
  const { guildId } = req.params;
  const { locale, panel_channel_id, embed_color, embed_footer, embed_logo, embed_title, embed_description, moderator_roles, enable_feedback, panel_type } = req.body;
  
  const enableFeedbackInt = enable_feedback ? 1 : 0;
  
  db.prepare(`
    UPDATE guilds 
    SET locale = ?, panel_channel_id = ?, embed_color = ?, embed_footer = ?, embed_logo = ?, embed_title = ?, embed_description = ?, moderator_roles = ?, enable_feedback = ?, panel_type = ?
    WHERE guild_id = ?
  `).run(
    locale, panel_channel_id, embed_color, embed_footer, embed_logo, embed_title, embed_description, 
    JSON.stringify(moderator_roles || []),
    enableFeedbackInt,
    panel_type || 'dropdown',
    guildId
  );
  
  res.json({ success: true });
});

// Categories
app.post('/api/guild/:guildId/categories', checkAdmin, (req, res) => {
  const { guildId } = req.params;
  const { name, require_reason, emoji, button_color, ticket_message } = req.body;
  const result = db.prepare('INSERT INTO categories (guild_id, name, require_reason, emoji, custom_id, button_color, ticket_message) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(guildId, name, require_reason ? 1 : 0, emoji, `cat_${Date.now()}`, button_color || '1', ticket_message || 'Please wait for a staff member to assist you.');
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/guild/:guildId/categories/:id', checkAdmin, (req, res) => {
  const { guildId, id } = req.params;
  const { name, emoji, button_color, ticket_message } = req.body;
  db.prepare(`
    UPDATE categories 
    SET name = ?, emoji = ?, button_color = ?, ticket_message = ?
    WHERE id = ? AND guild_id = ?
  `).run(name, emoji, button_color || '1', ticket_message || 'Please wait for a staff member to assist you.', id, guildId);
  res.json({ success: true });
});

app.delete('/api/guild/:guildId/categories/:id', checkAdmin, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ? AND guild_id = ?').run(req.params.id, req.params.guildId);
  res.json({ success: true });
});

// Custom Messages
app.post('/api/guild/:guildId/messages', checkAdmin, (req, res) => {
  const { guildId } = req.params;
  const { message_key, content } = req.body;

  const existing = db.prepare('SELECT * FROM messages WHERE guild_id = ? AND message_key = ?').get(guildId, message_key);
  if (existing) {
    db.prepare('UPDATE messages SET content = ? WHERE guild_id = ? AND message_key = ?').run(content, guildId, message_key);
  } else {
    db.prepare('INSERT INTO messages (guild_id, message_key, content) VALUES (?, ?, ?)').run(guildId, message_key, content);
  }
  res.json({ success: true });
});

// Tags API
app.get('/api/guild/:guildId/tags', checkAdmin, (req, res) => {
  const tags = db.prepare('SELECT * FROM tags WHERE guild_id = ?').all(req.params.guildId);
  res.json(tags);
});

app.post('/api/guild/:guildId/tags', checkAdmin, (req, res) => {
  const { name, content } = req.body;
  try {
    const result = db.prepare('INSERT INTO tags (guild_id, name, content) VALUES (?, ?, ?)').run(req.params.guildId, name, content);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'Tag with this name might already exist' });
  }
});

app.delete('/api/guild/:guildId/tags/:id', checkAdmin, (req, res) => {
  db.prepare('DELETE FROM tags WHERE id = ? AND guild_id = ?').run(req.params.id, req.params.guildId);
  res.json({ success: true });
});

// Questions API
app.get('/api/guild/:guildId/categories/:categoryId/questions', checkAdmin, (req, res) => {
  const questions = db.prepare('SELECT * FROM questions WHERE category_id = ?').all(req.params.categoryId);
  res.json(questions);
});

app.post('/api/guild/:guildId/categories/:categoryId/questions', checkAdmin, (req, res) => {
  const { label, type, required, min_length, max_length, placeholder, style } = req.body;
  const result = db.prepare(`
    INSERT INTO questions (category_id, label, type, required, min_length, max_length, placeholder, style)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.categoryId, label, type || 'TEXT', required ? 1 : 0, min_length || 0, max_length || 4000, placeholder || '', style || 2);
  res.json({ success: true, id: result.lastInsertRowid });
});

app.delete('/api/guild/:guildId/categories/:categoryId/questions/:id', checkAdmin, (req, res) => {
  db.prepare('DELETE FROM questions WHERE id = ? AND category_id = ?').run(req.params.id, req.params.categoryId);
  res.json({ success: true });
});

// Tickets API
app.get('/api/guild/:guildId/tickets', checkAdmin, (req, res) => {
  const tickets = db.prepare(`
    SELECT t.*, c.name as category_name
    FROM tickets t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.guild_id = ?
    ORDER BY t.created_at DESC
  `).all(req.params.guildId);
  res.json(tickets);
});

// Roles API
app.get('/api/guild/:guildId/roles', checkAdmin, async (req, res) => {
  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${req.params.guildId}/roles`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
    });
    if (!response.ok) return res.status(response.status).json({ error: 'Failed to fetch roles' });
    const roles = await response.json();
    // Filter out @everyone role (id === guildId)
    const filteredRoles = roles.filter(r => r.id !== req.params.guildId).map(r => ({
      id: r.id,
      name: r.name,
      color: r.color
    }));
    res.json(filteredRoles);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Emojis API
app.get('/api/guild/:guildId/emojis', checkAdmin, async (req, res) => {
  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${req.params.guildId}/emojis`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
    });
    if (!response.ok) return res.status(response.status).json({ error: 'Failed to fetch emojis' });
    const emojis = await response.json();
    const formattedEmojis = emojis.map(e => ({
      id: e.id,
      name: e.name,
      animated: e.animated
    }));
    res.json(formattedEmojis);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stats API
app.get('/api/guild/:guildId/stats', checkAdmin, async (req, res) => {
  const totalTickets = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE guild_id = ?').get(req.params.guildId).count;
  const openTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status = 'open'").get(req.params.guildId).count;
  const categories = db.prepare('SELECT COUNT(*) as count FROM categories WHERE guild_id = ?').get(req.params.guildId).count;
  const tags = db.prepare('SELECT COUNT(*) as count FROM tags WHERE guild_id = ?').get(req.params.guildId).count;
  
  let memberCount = 0;
  let onlineCount = 0;
  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${req.params.guildId}?with_counts=true`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
    });
    if (response.ok) {
      const data = await response.json();
      memberCount = data.approximate_member_count || 0;
      onlineCount = data.approximate_presence_count || 0;
    }
  } catch (err) {}
  
  res.json({
    totalTickets,
    openTickets,
    categories,
    tags,
    memberCount,
    onlineCount
  });
});

// Feedback API
app.get('/api/guild/:guildId/feedback', checkAdmin, (req, res) => {
  const feedback = db.prepare('SELECT * FROM feedback WHERE guild_id = ? ORDER BY created_at DESC').all(req.params.guildId);
  res.json(feedback);
});

app.delete('/api/guild/:guildId/feedback/:id', checkAdmin, (req, res) => {
  db.prepare('DELETE FROM feedback WHERE id = ? AND guild_id = ?').run(req.params.id, req.params.guildId);
  res.json({ success: true });
});

// Public Stats API for Login Page
app.get('/api/public/stats', (req, res) => {
  try {
    const totalGuilds = bot.guilds.cache.size;
    const totalUsers = bot.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    res.json({ totalGuilds, totalUsers });
  } catch (error) {
    res.json({ totalGuilds: 0, totalUsers: 0 });
  }
});

// Transcripts API
app.get('/api/guild/:guildId/tickets/:ticketId/transcript', checkAdmin, (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE ticket_id = ? AND guild_id = ?').get(req.params.ticketId, req.params.guildId);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const messages = db.prepare('SELECT * FROM archived_messages WHERE ticket_id = ? ORDER BY created_at ASC').all(req.params.ticketId);
  res.json({ ticket, messages });
});

app.delete('/api/guild/:guildId/tickets/:ticketId/transcript', checkAdmin, (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE ticket_id = ? AND guild_id = ?').get(req.params.ticketId, req.params.guildId);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  db.prepare('DELETE FROM archived_messages WHERE ticket_id = ?').run(req.params.ticketId);
  res.json({ success: true });
});

// Generate Panel
app.post('/api/guild/:guildId/panel', checkAdmin, async (req, res) => {
  const { guildId } = req.params;
  const guild = db.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guildId);
  if (!guild || !guild.panel_channel_id) return res.status(400).json({ error: 'Panel channel not configured' });

  const categories = db.prepare('SELECT * FROM categories WHERE guild_id = ?').all(guildId);
  if (categories.length === 0) return res.status(400).json({ error: 'No categories configured' });

  try {
    const discordGuild = await bot.guilds.fetch(guildId);
    const channel = await discordGuild.channels.fetch(guild.panel_channel_id);

    const embed = new EmbedBuilder()
      .setTitle(guild.embed_title || 'Support Tickets')
      .setDescription(guild.embed_description || 'Select a category below to open a ticket.')
      .setColor(guild.embed_color || '#0099ff')
      .setFooter({ text: guild.embed_footer || 'Support Tickets by FroglyStudios' });

    if (guild.embed_logo) {
      embed.setThumbnail(guild.embed_logo);
    }

    let components = [];
    
    if (guild.panel_type === 'buttons') {
      let currentRow = new ActionRowBuilder();
      for (let i = 0; i < categories.length; i++) {
        const c = categories[i];
        if (currentRow.components.length === 5) {
          components.push(currentRow);
          currentRow = new ActionRowBuilder();
        }
        
        let style = ButtonStyle.Primary;
        if (c.button_color === '2') style = ButtonStyle.Secondary;
        if (c.button_color === '3') style = ButtonStyle.Success;
        if (c.button_color === '4') style = ButtonStyle.Danger;
        
        const btn = new ButtonBuilder()
          .setCustomId(`ticket_btn_${c.id}`)
          .setLabel(c.name)
          .setStyle(style);
          
        if (c.emoji) {
          btn.setEmoji(c.emoji);
        }
        
        currentRow.addComponents(btn);
      }
      if (currentRow.components.length > 0) {
        components.push(currentRow);
      }
    } else {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_category_select')
        .setPlaceholder('Select a category...')
        .addOptions(categories.map(c => ({
          label: c.name,
          value: c.id.toString(),
          emoji: c.emoji || undefined
        })));
      components.push(new ActionRowBuilder().addComponents(selectMenu));
    }

    const newMessage = await channel.send({ embeds: [embed], components });
    db.prepare('UPDATE guilds SET panel_message_id = ? WHERE guild_id = ?').run(newMessage.id, guildId);

    res.json({ success: true, message: 'Panel created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create panel in Discord' });
  }
});

// Channels list for dashboard
app.get('/api/guild/:guildId/channels', checkAdmin, async (req, res) => {
  try {
    const discordGuild = await bot.guilds.fetch(req.params.guildId);
    const channels = discordGuild.channels.cache
      .filter(c => c.isTextBased())
      .map(c => ({ id: c.id, name: c.name }));
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Serve React App for all non-API routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Start API & Bot
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  bot.login(process.env.DISCORD_BOT_TOKEN);
});
