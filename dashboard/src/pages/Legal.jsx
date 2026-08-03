import React from 'react';

export default function Legal() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h2>Impressum</h2>
        <p>
          FroglyStudios<br/>
          Example Street 123<br/>
          12345 City, Country<br/>
          Contact: contact@frogly.fun
        </p>
      </div>

      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h2>Privacy Policy (Datenschutzbedingungen)</h2>
        <p>
          When you use our Discord bot and dashboard, we collect minimal data required for functionality:
        </p>
        <ul>
          <li>Discord User ID and Username for authentication.</li>
          <li>Server IDs (Guild IDs) and settings configured by server admins.</li>
          <li>Ticket reasons and associated user IDs for processing support requests.</li>
        </ul>
        <p>
          We do not share your data with third parties. All configuration data is stored securely.
          By logging in, you consent to the storage of this necessary data.
        </p>
      </div>

      <div className="glass-panel">
        <h2>Terms of Service (TOS)</h2>
        <p>
          By inviting the Support Tickets bot to your server, you agree to the following terms:
        </p>
        <ol>
          <li>You will not use the bot for malicious purposes or to facilitate spam.</li>
          <li>We reserve the right to revoke your access to the bot and dashboard if these terms are violated.</li>
          <li>The service is provided "as is" without any warranties.</li>
        </ol>
      </div>
    </div>
  );
}
