const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Schéma utilisateur pour la base de données
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },
  email: {
    type: String,
    required: [true, 'L\'email est obligatoire'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Veuillez fournir un email valide'
    ]
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false // Ne pas renvoyer le mot de passe par défaut
  },
  role: {
    type: String,
    enum: ['caissier', 'gerant', 'admin'],
    default: 'caissier'
  },
  status: {
    type: String,
    enum: ['active', 'blocked'],
    default: 'active'
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

/**
 * Middleware pour hash le mot de passe avant sauvegarde
 */
userSchema.pre('save', async function(next) {
  // Ne hash que si le mot de passe a été modifié
  if (!this.isModified('password')) {
    next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Méthode pour comparer les mots de passe
 */
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Méthode pour générer le token de réinitialisation
 */
userSchema.methods.getResetPasswordToken = function() {
  const crypto = require('crypto');
  
  // Générer token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token et le sauvegarder
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Définir expiration (15 minutes)
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
