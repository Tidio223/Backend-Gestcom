const nodemailer = require('nodemailer');

/**
 * Configuration du transporteur d'email (API Brevo au lieu de SMTP pour Render)
 */
const createTransporter = () => {
  // Utiliser l'API Brevo si disponible, sinon fallback sur SMTP
  if (process.env.BREVO_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  
  // Fallback SMTP pour développement local
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
 * Envoyer un email via l'API Brevo (pour contourner le blocage SMTP de Render)
 */
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    // URL de réinitialisation (pointe vers la page de connexion avec le token en paramètre)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/auth?resetToken=${resetToken}`;
    
    console.log('Tentative d\'envoi d\'email à:', email);
    console.log('URL de réinitialisation:', resetUrl);
    
    // Utiliser l'API Brevo si disponible (pour Render)
    if (process.env.BREVO_API_KEY) {
      return await sendEmailViaBrevoAPI(email, resetUrl);
    }
    
    // Fallback sur SMTP pour développement local
    return await sendEmailViaSMTP(email, resetUrl);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return false;
  }
};

/**
 * Envoyer un email via l'API Brevo (HTTP)
 */
const sendEmailViaBrevoAPI = async (email, resetUrl) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: 'GestCom',
          email: 'bahcheick508@gmail.com',
        },
        to: [{ email }],
        subject: 'Réinitialisation de votre mot de passe',
        htmlContent: `
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
      }),
    });

    if (response.ok) {
      console.log('Email envoyé avec succès via API Brevo');
      return true;
    } else {
      const error = await response.json();
      console.error('Erreur API Brevo:', error);
      return false;
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi via API Brevo:', error);
    return false;
  }
};

/**
 * Envoyer un email via SMTP (pour développement local)
 */
const sendEmailViaSMTP = async (email, resetUrl) => {
  try {
    const transporter = createTransporter();
    
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
    console.log('Email envoyé avec succès via SMTP:', info.response);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi via SMTP:', error);
    return false;
  }
};

/**
 * Envoyer un email de confirmation de changement d'email
 */
const sendEmailChangeConfirmation = async (oldEmail, newEmail) => {
  try {
    console.log('Tentative d\'envoi d\'email de confirmation à:', newEmail);
    
    // Utiliser l'API Brevo si disponible (pour Render)
    if (process.env.BREVO_API_KEY) {
      return await sendEmailChangeViaBrevoAPI(oldEmail, newEmail);
    }
    
    // Fallback sur SMTP pour développement local
    return await sendEmailChangeViaSMTP(oldEmail, newEmail);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de changement:', error);
    return false;
  }
};

/**
 * Envoyer un email de confirmation de changement de mot de passe
 */
const sendPasswordChangeConfirmation = async (email) => {
  try {
    console.log('Tentative d\'envoi d\'email de confirmation à:', email);
    
    // Utiliser l'API Brevo si disponible (pour Render)
    if (process.env.BREVO_API_KEY) {
      return await sendPasswordChangeViaBrevoAPI(email);
    }
    
    // Fallback sur SMTP pour développement local
    return await sendPasswordChangeViaSMTP(email);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de changement:', error);
    return false;
  }
};

/**
 * Envoyer un email de changement d'email via API Brevo
 */
const sendEmailChangeViaBrevoAPI = async (oldEmail, newEmail) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: 'GestCom',
          email: 'bahcheick508@gmail.com',
        },
        to: [{ email: newEmail }],
        subject: 'Confirmation de changement d\'adresse e-mail',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Confirmation de changement d'adresse e-mail</h2>
            <p>Bonjour,</p>
            <p>Votre adresse e-mail a été modifiée avec succès sur votre compte GestCom.</p>
            <p><strong>Ancienne adresse :</strong> ${oldEmail}</p>
            <p><strong>Nouvelle adresse :</strong> ${newEmail}</p>
            <p>Si vous n'avez pas effectué ce changement, veuillez contacter immédiatement le support.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">Cet email a été envoyé automatiquement par GestCom.</p>
          </div>
        `,
      }),
    });

    if (response.ok) {
      console.log('Email de changement envoyé avec succès via API Brevo');
      return true;
    } else {
      const error = await response.json();
      console.error('Erreur API Brevo:', error);
      return false;
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi via API Brevo:', error);
    return false;
  }
};

/**
 * Envoyer un email de changement de mot de passe via API Brevo
 */
const sendPasswordChangeViaBrevoAPI = async (email) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: 'GestCom',
          email: 'bahcheick508@gmail.com',
        },
        to: [{ email }],
        subject: 'Confirmation de changement de mot de passe',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Confirmation de changement de mot de passe</h2>
            <p>Bonjour,</p>
            <p>Votre mot de passe a été modifié avec succès sur votre compte GestCom.</p>
            <p>Si vous n'avez pas effectué ce changement, veuillez contacter immédiatement le support.</p>
            <p>Pour des raisons de sécurité, nous vous recommandons de :</p>
            <ul>
              <li>Utiliser un mot de passe unique et complexe</li>
              <li>Ne pas partager votre mot de passe avec personne</li>
              <li>Changer régulièrement votre mot de passe</li>
            </ul>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">Cet email a été envoyé automatiquement par GestCom.</p>
          </div>
        `,
      }),
    });

    if (response.ok) {
      console.log('Email de changement de mot de passe envoyé avec succès via API Brevo');
      return true;
    } else {
      const error = await response.json();
      console.error('Erreur API Brevo:', error);
      return false;
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi via API Brevo:', error);
    return false;
  }
};

/**
 * Envoyer un email de changement d'email via SMTP
 */
const sendEmailChangeViaSMTP = async (oldEmail, newEmail) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"GestCom" <bahcheick508@gmail.com>`,
      to: newEmail,
      subject: 'Confirmation de changement d\'adresse e-mail',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Confirmation de changement d'adresse e-mail</h2>
          <p>Bonjour,</p>
          <p>Votre adresse e-mail a été modifiée avec succès sur votre compte GestCom.</p>
          <p><strong>Ancienne adresse :</strong> ${oldEmail}</p>
          <p><strong>Nouvelle adresse :</strong> ${newEmail}</p>
          <p>Si vous n'avez pas effectué ce changement, veuillez contacter immédiatement le support.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">Cet email a été envoyé automatiquement par GestCom.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email de changement envoyé avec succès via SMTP:', info.response);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi via SMTP:', error);
    return false;
  }
};

/**
 * Envoyer un email de changement de mot de passe via SMTP
 */
const sendPasswordChangeViaSMTP = async (email) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"GestCom" <bahcheick508@gmail.com>`,
      to: email,
      subject: 'Confirmation de changement de mot de passe',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Confirmation de changement de mot de passe</h2>
          <p>Bonjour,</p>
          <p>Votre mot de passe a été modifié avec succès sur votre compte GestCom.</p>
          <p>Si vous n'avez pas effectué ce changement, veuillez contacter immédiatement le support.</p>
          <p>Pour des raisons de sécurité, nous vous recommandons de :</p>
          <ul>
            <li>Utiliser un mot de passe unique et complexe</li>
            <li>Ne pas partager votre mot de passe avec personne</li>
            <li>Changer régulièrement votre mot de passe</li>
          </ul>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">Cet email a été envoyé automatiquement par GestCom.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email de changement de mot de passe envoyé avec succès via SMTP:', info.response);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi via SMTP:', error);
    return false;
  }
};

module.exports = { sendPasswordResetEmail, sendEmailChangeConfirmation, sendPasswordChangeConfirmation };
