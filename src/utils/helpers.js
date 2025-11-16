import jwt from 'jsonwebtoken';

export const generateAccessToken = (user, expiresIn = null) => {
  const finalExpiry = expiresIn || process.env.JWT_EXPIRES_IN || '15m';
  
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      username: user.username
    },
    process.env.JWT_SECRET,
    {
      expiresIn: finalExpiry
    }
  );
};

export const generateRefreshToken = (user) => {
  const finalExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  
  return jwt.sign(
    {
      userId: user._id
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: finalExpiry
    }
  );
};

