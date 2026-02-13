import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export class PasswordSecurity {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }
    
    return await bcrypt.hash(password, SALT_ROUNDS)
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false
    }
    
    try {
      return await bcrypt.compare(password, hash)
    } catch (error) {
      console.error('Password verification error:', error)
      return false
    }
  }

  /**
   * Check if a hash looks like bcrypt (starts with $2a$, $2b$, or $2y$)
   */
  static isBcryptHash(hash: string): boolean {
    return /^\$2[aby]\$\d+\$/.test(hash)
  }

  /**
   * Migrate plain text password to bcrypt hash
   */
  static async migratePlainTextPassword(
    plainPassword: string, 
    storedValue: string
  ): Promise<{ isValid: boolean; newHash?: string }> {
    // If stored value is already a bcrypt hash, verify normally
    if (this.isBcryptHash(storedValue)) {
      const isValid = await this.verifyPassword(plainPassword, storedValue)
      return { isValid }
    }
    
    // If it's plain text, check if it matches and return new hash
    if (plainPassword === storedValue) {
      const newHash = await this.hashPassword(plainPassword)
      return { isValid: true, newHash }
    }
    
    return { isValid: false }
  }

  /**
   * Generate a secure random password
   */
  static generatePassword(length: number = 12): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    
    return password
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean
    errors: string[]
    strength: 'weak' | 'medium' | 'strong'
  } {
    const errors: string[] = []
    
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters')
    }
    
    if (password.length < 8) {
      errors.push('Password should be at least 8 characters for better security')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password should contain at least one uppercase letter')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password should contain at least one lowercase letter')
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password should contain at least one number')
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password should contain at least one special character')
    }
    
    let strength: 'weak' | 'medium' | 'strong' = 'weak'
    
    if (password.length >= 8 && errors.length <= 2) {
      strength = 'medium'
    }
    
    if (password.length >= 10 && errors.length === 0) {
      strength = 'strong'
    }
    
    return {
      isValid: password.length >= 6,
      errors: errors.filter(e => !e.includes('should')), // Only include critical errors
      strength
    }
  }
}