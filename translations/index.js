const fs = require('fs');
const path = require('path');
const db = require('../db');

const loadTranslations = () => {
  const en = JSON.parse(fs.readFileSync(path.join(__dirname, 'en.json'), 'utf8'));
  const de = JSON.parse(fs.readFileSync(path.join(__dirname, 'de.json'), 'utf8'));
  return { en, de };
};

const translations = loadTranslations();

const getTranslation = (guildId, key, variables = {}) => {
  let locale = 'en';
  if (guildId) {
    const guild = db.prepare('SELECT locale FROM guilds WHERE guild_id = ?').get(guildId);
    if (guild && guild.locale) {
      locale = guild.locale;
    }
  }

  // Check if there is a custom message override in DB
  if (guildId) {
    const override = db.prepare('SELECT content FROM messages WHERE guild_id = ? AND message_key = ?').get(guildId, key);
    if (override && override.content) {
      let text = override.content;
      for (const [vKey, vValue] of Object.entries(variables)) {
        text = text.replace(`{${vKey}}`, vValue);
      }
      return text;
    }
  }

  // Fallback to default
  const dict = translations[locale] || translations['en'];
  let text = dict[key] || translations['en'][key] || key;

  for (const [vKey, vValue] of Object.entries(variables)) {
    text = text.replace(`{${vKey}}`, vValue);
  }

  return text;
};

module.exports = { getTranslation, translations };
