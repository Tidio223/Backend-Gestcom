const nodemailer = require('nodemailer');

/**
 * Configuration du transporteur d'email (Brevo/Sendinblue)
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port: process.env.EMAIL_PORT || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
};

/**
 * Envoyer un email de réinitialisation de mot de passe
 */
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();
    
    // URL de réinitialisation (pointe vers la page de connexion avec le token en paramètre)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/auth?resetToken=${resetToken}`;
    
    console.log('Tentative d\'envoi d\'email à:', email);
    console.log('URL de réinitialisation:', resetUrl);
    
    const mailOptions = {
      from: `"GestCom" <bahcheick508@gmail.com>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Réinitialisation de votre mot de passe</h2>
          <p>Bonjour,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte GestCom.</p>
          <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
          <p>
            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p>Si vous n'avez pas demandé esta réinitialisation, ignorez cet email.</p>
          <p>Ce lien expirera dans 1 heure.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">Cet email a été envoyé automatiquement par GestCom.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email envoyé avec succès:', info.response);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return false;
  }
};

module.exports = { sendPasswordResetEmail };
