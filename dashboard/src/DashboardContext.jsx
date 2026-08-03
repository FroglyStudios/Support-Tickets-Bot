import React, { createContext, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { locales } from './locales';

const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
  const { guildId } = useParams();
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    if (guildId) {
      fetch(`/api/guild/${guildId}/settings`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.guild && data.guild.locale) {
            setLocale(data.guild.locale);
          }
        })
        .catch(() => {});
    }
  }, [guildId]);

  const t = (key) => {
    return locales[locale]?.[key] || locales['en']?.[key] || key;
  };

  return (
    <DashboardContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
